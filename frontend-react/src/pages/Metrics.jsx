import { useEffect, useState } from "react";

export default function Metrics() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:8000/requests")
      .then((res) => res.json())
      .then((reqs) => {
        const stageTimes = {};
        
        reqs.forEach((req) => {
          req.approval_steps.forEach((step) => {
            if (["approved", "rejected", "sent_back"].includes(step.status) && step.resolved_at) {
              const entered = new Date(step.entered_at.replace("Z", "+00:00")).getTime();
              const resolved = new Date(step.resolved_at.replace("Z", "+00:00")).getTime();
              const days = Math.max(0, (resolved - entered) / (1000 * 60 * 60 * 24));
              
              if (!stageTimes[step.stakeholder_role]) {
                stageTimes[step.stakeholder_role] = [];
              }
              stageTimes[step.stakeholder_role].push(days);
            }
          });
        });
        
        const chartData = Object.keys(stageTimes).map((role) => {
          const times = stageTimes[role];
          const avg = times.reduce((a, b) => a + b, 0) / times.length;
          return { role, avg, count: times.length };
        });
        
        setData(chartData);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading metrics...</p>;

  const maxAvg = Math.max(...data.map(d => d.avg), 1); // fallback to 1 to avoid / 0

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Metrics & SLA Overview</h1>
      
      {data.length === 0 ? (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
          <p className="text-blue-700">Not enough resolved stages to show metrics yet. Approve/Reject requests to see data.</p>
        </div>
      ) : (
        <div className="bg-white shadow sm:rounded-lg px-4 py-5">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-6">Average Dwell Time by Stage (Days)</h3>
          
          <div className="space-y-4">
            {data.map((item, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                  <span>{item.role}</span>
                  <span>{item.avg.toFixed(2)} days ({item.count} samples)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div 
                    className="bg-indigo-600 h-4 rounded-full" 
                    style={{ width: `${(item.avg / maxAvg) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
