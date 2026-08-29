"""Minimal multi-role dashboard — deliberately unstyled, this is the piece we scoped down
so the team could spend the time on extraction + routing instead. Production version uses
Next.js/Tailwind/Shadcn per the pitch deck.
"""

import requests
import streamlit as st

API = "http://localhost:8000"

st.set_page_config(page_title="NITK Workflow & Approval System", layout="wide")
st.title("NITK Administrative Workflow & Approval System")

# --- fake IRIS login ---
with st.sidebar:
    st.header("Login (IRIS stub)")
    username = st.selectbox("Login as", ["student1", "advisor1", "hod1", "dean1", "deanrd1"])
    # TODO: call /auth/iris_stub once that endpoint is wired up; for now just display
    role_map = {
        "student1": "student", "advisor1": "faculty_advisor",
        "hod1": "hod", "dean1": "dean_swo", "deanrd1": "dean_rd",
    }
    current_role = role_map[username]
    st.caption(f"Role: **{current_role}**")

tab1, tab2, tab3 = st.tabs(["Submit a proposal", "My queue", "Audit trail"])

with tab1:
    st.subheader("Upload a proposal document")
    uploaded = st.file_uploader("PDF, DOCX, or TXT", type=["pdf", "docx", "txt"])
    if uploaded and st.button("Submit"):
        files = {"file": (uploaded.name, uploaded.getvalue())}
        resp = requests.post(f"{API}/requests/upload", files=files)
        if resp.ok:
            data = resp.json()
            st.success(f"Request #{data['id']} created — type: {data['request_type']}")
            st.json(data["extracted_json"])
            st.write("Routed to:", [s["stakeholder_role"] for s in data["approval_steps"]])
        else:
            st.error(resp.text)

with tab2:
    st.subheader(f"Requests awaiting {current_role}")
    resp = requests.get(f"{API}/requests")
    if resp.ok:
        for req in resp.json():
            steps = req["approval_steps"]
            idx = req["current_stage_index"]
            if idx < len(steps) and steps[idx]["stakeholder_role"] == current_role and req["status"] == "pending":
                with st.expander(f"Request #{req['id']} — {req['request_type']}"):
                    st.json(req["extracted_json"])
                    col1, col2, col3 = st.columns(3)
                    if col1.button("Approve", key=f"a{req['id']}"):
                        requests.post(f"{API}/requests/{req['id']}/approve", json={"actor_role": current_role})
                        st.rerun()
                    if col2.button("Reject", key=f"r{req['id']}"):
                        requests.post(f"{API}/requests/{req['id']}/reject", json={"actor_role": current_role})
                        st.rerun()
                    if col3.button("Send back", key=f"s{req['id']}"):
                        requests.post(f"{API}/requests/{req['id']}/send_back", json={"actor_role": current_role})
                        st.rerun()

with tab3:
    st.subheader("Audit trail")
    request_id = st.number_input("Request ID", min_value=1, step=1)
    if st.button("Load"):
        resp = requests.get(f"{API}/requests/{request_id}")
        if resp.ok:
            for entry in resp.json()["audit_entries"]:
                st.write(f"`{entry['timestamp']}` — **{entry['actor_role']}** {entry['action']} — {entry.get('notes') or ''}")
