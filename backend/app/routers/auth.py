from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import timedelta

from backend.app.database import get_db
from backend.app.models import User, UserRole, AuthProvider
from backend.app.schemas import (
    UserCreate, UserLogin, GoogleLoginRequest, TokenResponse, UserResponse,
    UserProfileUpdate, UserPasswordChange
)
from backend.app.config import settings
from backend.app.auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user, verify_google_id_token, invalidate_user_cache
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.get("/config", summary="Get public auth configuration (Google Client ID)")
async def get_auth_config():
    return {
        "google_client_id": settings.GOOGLE_CLIENT_ID
    }

@router.post("/register", response_model=TokenResponse, summary="Register a new user (First user is automatically ADMIN)")
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    email_clean = user_in.email.lower().strip()
    
    # Check if user already exists
    existing_user_query = await db.execute(select(User).where(User.email == email_clean))
    existing_user = existing_user_query.scalars().first()
    
    if existing_user:
        # Account Merging logic:
        # If user originally signed up via Google and has no password hash, attach the password hash
        if not existing_user.password_hash:
            existing_user.password_hash = get_password_hash(user_in.password)
            await db.commit()
            await db.refresh(existing_user)
            access_token = create_access_token(data={"sub": existing_user.email, "role": existing_user.role.value})
            return TokenResponse(access_token=access_token, user=UserResponse.model_validate(existing_user))
        
        # If user exists with password, verify if password matches
        if verify_password(user_in.password, existing_user.password_hash):
            access_token = create_access_token(data={"sub": existing_user.email, "role": existing_user.role.value})
            return TokenResponse(access_token=access_token, user=UserResponse.model_validate(existing_user))
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists. Please log in instead."
        )

    # Check total user count to assign first user as ADMIN
    count_query = await db.execute(select(func.count()).select_from(User))
    total_users = count_query.scalar_one()
    
    assigned_role = UserRole.ADMIN if total_users == 0 else UserRole.STAFF

    new_user = User(
        email=email_clean,
        name=email_clean.split("@")[0].capitalize(),
        currency="$",
        password_hash=get_password_hash(user_in.password),
        role=assigned_role,
        auth_provider=AuthProvider.LOCAL
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    access_token = create_access_token(data={"sub": new_user.email, "role": new_user.role.value})
    return TokenResponse(access_token=access_token, user=UserResponse.model_validate(new_user))

@router.post("/login", response_model=TokenResponse, summary="Log in with email and password")
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    email_clean = credentials.email.lower().strip()
    result = await db.execute(select(User).where(User.email == email_clean))
    user = result.scalars().first()

    if not user or not user.password_hash or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    access_token = create_access_token(data={"sub": user.email, "role": user.role.value})
    return TokenResponse(access_token=access_token, user=UserResponse.model_validate(user))

@router.post("/google", response_model=TokenResponse, summary="Login or Register via Google OAuth (Seamless account merging)")
async def google_auth(payload: GoogleLoginRequest, db: AsyncSession = Depends(get_db)):
    google_data = verify_google_id_token(payload.credential)
    email_clean = google_data["email"]

    # Check if user already exists
    result = await db.execute(select(User).where(User.email == email_clean))
    user = result.scalars().first()

    if user:
        # Seamless account merging: user exists!
        # If user has missing name or picture, backfill from Google
        needs_commit = False
        if not user.name and google_data.get("name"):
            user.name = google_data.get("name")
            needs_commit = True
        if not user.profile_picture and google_data.get("picture"):
            user.profile_picture = google_data.get("picture")
            needs_commit = True
        if needs_commit:
            await db.commit()
            await db.refresh(user)

        access_token = create_access_token(data={"sub": user.email, "role": user.role.value})
        return TokenResponse(access_token=access_token, user=UserResponse.model_validate(user))

    # New user registering via Google
    count_query = await db.execute(select(func.count()).select_from(User))
    total_users = count_query.scalar_one()
    assigned_role = UserRole.ADMIN if total_users == 0 else UserRole.STAFF

    new_user = User(
        email=email_clean,
        name=google_data.get("name") or email_clean.split("@")[0].capitalize(),
        profile_picture=google_data.get("picture"),
        password_hash=None,
        role=assigned_role,
        auth_provider=AuthProvider.GOOGLE,
        currency="$"
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    access_token = create_access_token(data={"sub": new_user.email, "role": new_user.role.value})
    return TokenResponse(access_token=access_token, user=UserResponse.model_validate(new_user))

@router.get("/me", response_model=UserResponse, summary="Get current logged in user profile")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.patch("/profile", response_model=UserResponse, summary="Update user profile (name, username, profile picture, currency)")
async def update_profile(
    payload: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user = await db.get(User, current_user.id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check username uniqueness if provided
    if payload.username is not None:
        clean_username = payload.username.strip().lower()
        if clean_username:
            # Alphanumeric with dots, underscores, hyphens
            import re
            if not re.match(r"^[a-zA-Z0-9._-]+$", clean_username):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username can only contain letters, numbers, dots, underscores, and hyphens."
                )
            # Check if occupied by another user
            existing = await db.execute(
                select(User).where(User.username == clean_username, User.id != user.id)
            )
            if existing.scalars().first():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Username '@{clean_username}' is already taken. Please choose another."
                )
            user.username = clean_username
        else:
            user.username = None

    if payload.name is not None:
        user.name = payload.name.strip() or None

    if payload.profile_picture is not None:
        user.profile_picture = payload.profile_picture.strip() or None

    if payload.currency is not None:
        clean_currency = payload.currency.strip()
        user.currency = clean_currency[:10] if clean_currency else "$"

    await db.commit()
    await db.refresh(user)
    invalidate_user_cache(user.email)
    return user

@router.post("/change-password", summary="Change or set user password")
async def change_password(
    payload: UserPasswordChange,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user = await db.get(User, current_user.id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # If user already has a local password hash, require current password verification
    if user.password_hash:
        if not payload.current_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is required to set a new password."
            )
        if not verify_password(payload.current_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect. Please verify and try again."
            )

    if len(payload.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long."
        )

    user.password_hash = get_password_hash(payload.new_password)
    await db.commit()
    invalidate_user_cache(user.email)
    return {"status": "success", "message": "Password updated successfully."}
