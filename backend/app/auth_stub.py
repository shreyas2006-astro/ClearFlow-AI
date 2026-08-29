"""Simulates IRIS SSO for the demo. In production this is a real OAuth/SAML call to
IRIS's existing identity system — students and faculty never create a new account.
Say this explicitly when presenting; don't imply this stub is a live integration."""

FAKE_USERS = {
    "student1": {"role": "student", "name": "Aditya R"},
    "advisor1": {"role": "faculty_advisor", "name": "Dr. Kamath"},
    "hod1": {"role": "hod", "name": "Dr. Shenoy"},
    "dean1": {"role": "dean_swo", "name": "Dr. Bhat"},
    "deanrd1": {"role": "dean_rd", "name": "Dr. Pai"},
}


def fake_login(username: str) -> dict:
    return FAKE_USERS.get(username, {"role": "unknown", "name": "Guest"})
