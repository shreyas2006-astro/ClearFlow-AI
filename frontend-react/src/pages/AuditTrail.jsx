import { useEffect, useState } from "react";

export default function AuditTrail() {
  const [requests, setRequests] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("http://localhost:8000/requests")
      .then((res) => res.json())
      .then((data) => setRequests(data))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetails(null);
      return;
    }
    
    setLoading(true);
    fetch(`http://localhost:8000/requests/${selectedId}`)
      .then((res) => res.json())
      .then((data) => setDetails(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [selectedId]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Audit Trail</h1>

      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <label className="block text-sm font-medium text-gray-700">Select a Request to View Audit Log</label>
        <select
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border text-black"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <option value="">-- Select a Request --</option>
          {requests.map((req) => (
            <option key={req.id} value={req.id}>
              Request #{req.id} - {req.request_type} ({req.status})
            </option>
          ))}
        </select>
      </div>

      {loading && <p>Loading details...</p>}

      {details && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white shadow sm:rounded-lg px-4 py-5">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Routing Plan & Status</h3>
            <div className="flow-root">
              <ul className="-mb-8">
                {details.approval_steps.map((step, stepIdx) => (
                  <li key={step.id || stepIdx}>
                    <div className="relative pb-8">
                      {stepIdx !== details.approval_steps.length - 1 ? (
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white
                            ${step.status === 'approved' ? 'bg-green-500' : 
                              step.status === 'rejected' ? 'bg-red-500' : 
                              step.status === 'sent_back' ? 'bg-yellow-500' : 'bg-gray-300'}`}>
                            {step.status === 'approved' && <span className="text-white">✓</span>}
                            {step.status === 'rejected' && <span className="text-white">✗</span>}
                            {step.status === 'pending' && <span className="text-white">⌛</span>}
                            {step.status === 'sent_back' && <span className="text-white">⟲</span>}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-gray-500">
                              <strong className="text-gray-900">{step.stakeholder_role}</strong>{" "}
                              {step.status}
                            </p>
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-gray-500">
                            SLA: {step.sla_days} days
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-white shadow sm:rounded-lg px-4 py-5">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Action Log</h3>
            <div className="space-y-4">
              {details.audit_entries.map((entry, i) => (
                <div key={i} className="border-l-4 border-indigo-500 pl-3 py-1">
                  <div className="text-xs text-gray-500 mb-1">
                    {new Date(entry.timestamp).toLocaleString()}
                  </div>
                  <p className="text-sm">
                    <strong>{entry.actor_role}</strong> performed <strong>{entry.action}</strong>
                  </p>
                  {entry.notes && (
                    <p className="text-sm text-gray-600 mt-1 italic">"{entry.notes}"</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
