import asyncio
import httpx
import pytest
from httpx import ASGITransport
from backend.app.main import app
from backend.app.database import init_db

@pytest.mark.asyncio
async def test_full_backend_lifecycle():
    await init_db()

    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Health check
        res = await client.get("/api/health")
        assert res.status_code == 200
        assert res.json()["status"] == "healthy"

        # 2. Register first user -> ADMIN
        unique_admin_email = f"lead_admin_{asyncio.get_event_loop().time()}@test.com"
        res = await client.post("/api/auth/register", json={
            "email": unique_admin_email,
            "password": "Password123!"
        })
        # If database already had users from seed, status is 200 or 400. Let's test login with admin
        if res.status_code == 201 or res.status_code == 200:
            data = res.json()
            assert "access_token" in data
            token = data["access_token"]
            auth_headers = {"Authorization": f"Bearer {token}"}
        else:
            # Login with existing admin
            login_res = await client.post("/api/auth/login", json={
                "email": "admin@pharmacy.com",
                "password": "Admin123!"
            })
            assert login_res.status_code == 200
            token = login_res.json()["access_token"]
            auth_headers = {"Authorization": f"Bearer {token}"}

        # 3. Test /api/auth/me
        me_res = await client.get("/api/auth/me", headers=auth_headers)
        assert me_res.status_code == 200
        assert "email" in me_res.json()

        # 4. Test CRUD + Inline PATCH on Patients
        patient_res = await client.post("/api/patients", json={
            "name": "Alex Mercer",
            "age": 35,
            "gender": "Male",
            "contact": "+1 (555) 777-8888",
            "medical_history": "No known allergies."
        }, headers=auth_headers)
        assert patient_res.status_code == 201
        patient_id = patient_res.json()["id"]

        # Inline edit patient contact
        patch_patient_res = await client.patch(f"/api/patients/{patient_id}", json={
            "contact": "+1 (555) 999-0000"
        }, headers=auth_headers)
        assert patch_patient_res.status_code == 200
        assert patch_patient_res.json()["contact"] == "+1 (555) 999-0000"

        # 5. Test CRUD + Inline PATCH on Medicines (Inventory)
        med_res = await client.post("/api/medicines", json={
            "name": "Paracetamol 500mg",
            "batch_number": "PAR-2025-01",
            "expiry_date": "2026-12-31",
            "stock_quantity": 100,
            "price": 5.50,
            "location": "Aisle 1 - Shelf B"
        }, headers=auth_headers)
        assert med_res.status_code == 201
        med_id = med_res.json()["id"]

        # Inline edit medicine stock & price
        patch_med_res = await client.patch(f"/api/medicines/{med_id}", json={
            "stock_quantity": 85,
            "price": 6.20
        }, headers=auth_headers)
        assert patch_med_res.status_code == 200
        assert patch_med_res.json()["stock_quantity"] == 85
        assert patch_med_res.json()["price"] == 6.20

        # 6. Test Billing Stats & Creation
        bill_res = await client.post("/api/billing", json={
            "patient_id": patient_id,
            "total_amount": 125.00,
            "payment_status": "PENDING",
            "date": "2026-09-04"
        }, headers=auth_headers)
        assert bill_res.status_code == 201
        bill_id = bill_res.json()["id"]

        # Inline update payment status to PAID
        patch_bill_res = await client.patch(f"/api/billing/{bill_id}", json={
            "payment_status": "PAID"
        }, headers=auth_headers)
        assert patch_bill_res.status_code == 200
        assert patch_bill_res.json()["payment_status"] == "PAID"

        # Financial stats check
        stats_res = await client.get("/api/billing/stats", headers=auth_headers)
        assert stats_res.status_code == 200
        stats = stats_res.json()
        assert stats["total_revenue"] >= 125.0

        # 7. Test Admin Backup Download
        admin_login = await client.post("/api/auth/login", json={
            "email": "admin@pharmacy.com",
            "password": "Admin123!"
        })
        adm_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"} if admin_login.status_code == 200 else auth_headers

        backup_res = await client.get("/api/admin/backup", headers=adm_headers)
        assert backup_res.status_code == 200
        backup_data = backup_res.json()
        assert "patients" in backup_data
        assert "medicines" in backup_data
        assert "billing" in backup_data
        print(f"\nBackend verification passed! Restored tables verified, Patients count: {len(backup_data['patients'])}")

if __name__ == "__main__":
    asyncio.run(test_full_backend_lifecycle())
