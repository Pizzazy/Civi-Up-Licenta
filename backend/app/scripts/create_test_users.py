"""Create three test users using the admin Supabase client.

This script creates:
- Social Media Manager -> role `communications`
- Accountant -> role `financial_officer`
- Normal User -> role `voluntar`

It writes email/password pairs to `credentials.txt` in the repository root.
Passwords are intentionally weak as requested ("1234").
"""
from datetime import datetime, timezone
import sys
import traceback

from app.database import supabase_admin


USERS = [
    {
        "email": "social.manager@example.com",
        "full_name": "Social Media Manager",
        "role": "communications",
        "password": "1234",
    },
    {
        "email": "accountant@example.com",
        "full_name": "Contabil",
        "role": "financial_officer",
        "password": "1234",
    },
    {
        "email": "utilizator@example.com",
        "full_name": "Utilizator Normal",
        "role": "voluntar",
        "password": "1234",
    },
]


def initials(name: str) -> str:
    return "".join([w[0] for w in name.split() if w]).upper()[:2] or "U"


def main():
    created = []
    now = datetime.now(timezone.utc).isoformat()
    for u in USERS:
        email = u["email"].strip().lower()
        pwd = u["password"]
        full_name = u["full_name"].strip()
        role = u["role"]

        try:
            # Create auth user via admin API
            resp = supabase_admin.auth.admin.create_user(
                {"email": email, "password": pwd, "email_confirm": True}
            )
            new_user = getattr(resp, "user", None) or resp.get("user") if isinstance(resp, dict) else None
            if not new_user:
                print(f"Could not create auth user for {email}; response: {resp}")
                continue
            user_id = new_user.id if hasattr(new_user, "id") else new_user.get("id")

            profile = {
                "id": user_id,
                "full_name": full_name,
                "avatar_initials": initials(full_name),
                "role": role,
                "status": "activ",
                "created_at": now,
                "updated_at": now,
            }
            prof_resp = supabase_admin.table("profiles").insert(profile).execute()
            if not (prof_resp and getattr(prof_resp, "data", None)):
                print(f"Warning: profile insert returned no data for {email}: {prof_resp}")

            created.append({"email": email, "password": pwd, "role": role})
            print(f"Created user {email} (role={role})")

        except Exception as exc:
            print(f"Error creating user {email}: {exc}")
            traceback.print_exc()

    # Write credentials to root credentials.txt
    try:
        with open("credentials.txt", "w", encoding="utf-8") as fh:
            fh.write("# Generated credentials\n")
            fh.write(f"# Generated at: {datetime.now(timezone.utc).isoformat()}\n\n")
            for c in created:
                fh.write(f"{c['role']} | {c['email']} | {c['password']}\n")
        print("Wrote credentials.txt in repo root.")
    except Exception as exc:
        print(f"Failed to write credentials.txt: {exc}")
        traceback.print_exc()


if __name__ == "__main__":
    main()
