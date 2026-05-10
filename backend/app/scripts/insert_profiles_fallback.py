"""Insert profiles into the `profiles` table if they do not exist already.
This is a fallback to ensure the three requested accounts exist as profile rows.
"""
import uuid
from datetime import datetime, timezone
from app.database import supabase_admin

USERS = [
    {"email": "social.manager@example.com", "full_name": "Social Media Manager", "role": "communications"},
    {"email": "accountant@example.com", "full_name": "Contabil", "role": "financial_officer"},
    {"email": "utilizator@example.com", "full_name": "Utilizator Normal", "role": "voluntar"},
]


def initials(name: str) -> str:
    return "".join([w[0] for w in name.split() if w]).upper()[:2] or "U"


def main():
    now = datetime.now(timezone.utc).isoformat()
    created = []
    for u in USERS:
        email = u["email"].strip().lower()
        # Check if a profile with this email already exists
        resp = supabase_admin.table("profiles").select("*").eq("email", email).maybe_single().execute()
        if resp and getattr(resp, "data", None):
            print(f"Profile for {email} already exists.")
            continue

        new_id = str(uuid.uuid4())
        profile = {
            "id": new_id,
            "email": email,
            "full_name": u["full_name"],
            "avatar_initials": initials(u["full_name"]),
            "role": u["role"],
            "status": "activ",
            "created_at": now,
            "updated_at": now,
        }
        try:
            r = supabase_admin.table("profiles").insert(profile).execute()
            if r and getattr(r, "data", None):
                print(f"Inserted profile for {email} (id={new_id})")
                created.append(profile)
            else:
                print(f"Insert returned no data for {email}: {r}")
        except Exception as exc:
            print(f"Error inserting profile for {email}: {exc}")

    # Append credentials to backend/credentials.txt so we keep them together
    try:
        with open("credentials.txt", "a", encoding="utf-8") as fh:
            for u in USERS:
                fh.write(f"{u['role']} | {u['email']} | 1234\n")
        print("Appended credentials to backend/credentials.txt")
    except Exception as exc:
        print(f"Failed to append credentials file: {exc}")


if __name__ == "__main__":
    main()
