import React from "react";

export default function FormattedDataViewer({ data }) {
  if (!data || typeof data !== "object") {
    return <span>{String(data)}</span>;
  }

  const formatKey = (key) => {
    return key
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="bg-gray-50 p-4 rounded-md text-sm text-gray-800 border border-gray-200">
      <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="sm:col-span-1">
            <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {formatKey(key)}
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {Array.isArray(value) ? (
                value.length > 0 ? (
                  <ul className="list-disc pl-5">
                    {value.map((item, idx) => (
                      <li key={idx} className="text-red-600">{String(item)}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-gray-400 italic">None</span>
                )
              ) : value !== null && value !== undefined && value !== "" ? (
                String(value)
              ) : (
                <span className="text-gray-400 italic">Not provided</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
