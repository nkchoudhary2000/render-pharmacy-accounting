from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.database import get_db
from backend.app.models import User, UserRole
from backend.app.schemas import UserResponse, UserRoleUpdate
from backend.app.auth import get_current_admin, invalidate_user_cache

router = APIRouter(prefix="/api/admin/users", tags=["Admin User Management"])

@router.get("", response_model=List[UserResponse], summary="List all system users (Admin only)")
async def list_users(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    result = await db.execute(select(User).order_by(User.id.asc()))
    users = result.scalars().all()
    return users

@router.patch("/{user_id}/role", response_model=UserResponse, summary="Update user role (Admin only)")
async def update_user_role(
    user_id: int,
    role_update: UserRoleUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.id == admin.id and role_update.role != UserRole.ADMIN:
        raise HTTPException(status_code=400, detail="Cannot revoke your own admin role")
        
    user.role = role_update.role
    await db.commit()
    await db.refresh(user)
    invalidate_user_cache(user.email)
    return user

@router.delete("/{user_id}", summary="Delete a user (Admin only)")
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own user account")
        
    user_email = user.email
    await db.delete(user)
    await db.commit()
    invalidate_user_cache(user_email)
    return {"status": "success", "message": f"User {user_email} deleted successfully"}
