import { useEffect, useState } from "react";
import { useAuth } from "../components/AuthContext";
import FormattedDataViewer from "../components/FormattedDataViewer";
import ResubmitForm from "../components/ResubmitForm";

export default function Queue() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState({});
  const [targetStages, setTargetStages] = useState({});

  const fetchQueue = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      const res = await fetch("http://localhost:8000/requests");
      if (res.ok) {
        const allReqs = await res.json();
        
        const awaiting = [];
        for (const req of allReqs) {
          if (user.role === "student" && req.status === "revision_requested") {
            awaiting.push({ ...req, sla: null });
            continue;
          }
          
          const steps = req.approval_steps;
          const idx = req.current_stage_index;
          if (idx < steps.length && steps[idx].stakeholder_role === user.role && req.status === "pending") {
            const slaRes = await fetch(`http://localhost:8000/requests/${req.id}/sla_status`);
            let sla = null;
            if (slaRes.ok) {
              sla = await slaRes.json();
            }
            awaiting.push({ ...req, sla });
          }
        }
        setRequests(awaiting);
      }
    } catch (e) {
      console.error("Error fetching queue", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [user]);

  const handleResubmit = async (id, extracted_json) => {
    if (!user) return;

    try {
      const res = await fetch(`http://localhost:8000/requests/${id}/resubmit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor_role: user.role, extracted_json }),
      });

      if (res.ok) {
        fetchQueue();
      } else {
        alert("Resubmit failed");
      }
    } catch (e) {
      alert("Error performing action");
    }
  };

  const handleAction = async (id, action) => {
    if (!user) return;
    
    const payload = {
      actor_role: user.role,
      notes: notes[id] || "",
    };

    if (action === "send_back") {
      const targetStage = targetStages[id];
      if (targetStage !== undefined && targetStage !== "") {
        payload.target_stage_index = parseInt(targetStage, 10);
      }
    }

    try {
      const res = await fetch(`http://localhost:8000/requests/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        fetchQueue();
      } else {
        alert("Action failed");
      }
    } catch (e) {
      alert("Error performing action");
    }
  };

  if (!user) {
    return (
      <div className="bg-yellow-50 p-4 border-l-4 border-yellow-400">
        <p className="text-yellow-700">Please login to view your queue.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Requests Awaiting {user.name} ({user.role})</h1>

      {loading ? (
        <p>Loading...</p>
      ) : requests.length === 0 ? (
        <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6 text-center text-gray-500">
          No requests awaiting your action.
        </div>
      ) : (
        <div className="space-y-6">
          {requests.map((req) => (
            <div key={req.id} className="bg-white shadow sm:rounded-lg overflow-hidden border border-gray-200">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-200">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Request #{req.id} — {req.request_type}
                  </h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">
                    Submitted: {new Date(req.created_at).toLocaleDateString()}
                  </p>
                </div>
                {req.sla && (
                  <div>
                    {req.sla.breached ? (
                      <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-red-100 text-red-800">
                        SLA Breached ({req.sla.days_pending}/{req.sla.sla_days} days)
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        Within SLA ({req.sla.days_pending}/{req.sla.sla_days} days)
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="px-4 py-5 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                     <h4 className="text-sm font-bold text-gray-700 mb-2">Extracted Data</h4>
                     <FormattedDataViewer data={req.extracted_json} />
                   </div>
                    <div className="flex flex-col justify-end space-y-4">
                      {user.role === "student" ? (
                        <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                          <h4 className="text-sm font-bold text-gray-700 mb-4">Revise Request Details</h4>
                          <ResubmitForm req={req} onResubmit={handleResubmit} />
                        </div>
                      ) : (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Notes (optional)</label>
                            <input 
                              type="text" 
                              value={notes[req.id] || ""}
                              onChange={(e) => setNotes({...notes, [req.id]: e.target.value})}
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-3 py-2 border"
                              placeholder="Reason for rejection or approval notes..."
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Send Back Target</label>
                            <select 
                              value={targetStages[req.id] !== undefined ? targetStages[req.id] : "-1"}
                              onChange={(e) => setTargetStages({...targetStages, [req.id]: e.target.value})}
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-3 py-2 border"
                            >
                              <option value="-1">-- Send to Applicant --</option>
                              {req.approval_steps.slice(0, req.current_stage_index).map((step, idx) => (
                                <option key={idx} value={step.stage_order}>
                                  {step.stakeholder_role}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex space-x-3">
                            <button onClick={() => handleAction(req.id, "approve")} className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700">
                              Approve
                            </button>
                            <button onClick={() => handleAction(req.id, "reject")} className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700">
                              Reject
                            </button>
                            <button onClick={() => handleAction(req.id, "send_back")} className="flex-1 bg-yellow-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-yellow-700">
                              Send Back
                            </button>
                          </div>
                        </>
                      )}
                   </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
