import React, { useState } from "react";

export default function ResubmitForm({ req, onResubmit }) {
  const [formData, setFormData] = useState(req.extracted_json || {});

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    // Keep compliance_flags or other array/object properties intact
    const mergedData = { ...req.extracted_json, ...formData };
    onResubmit(req.id, mergedData);
  };

  // Filter out lists/objects for simple editing
  const editableKeys = Object.keys(formData).filter(
    (key) => typeof formData[key] === "string" || typeof formData[key] === "number"
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {editableKeys.map((key) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 capitalize mb-1">
              {key.replace(/_/g, " ")}
            </label>
            <input
              type={typeof formData[key] === "number" ? "number" : "text"}
              value={formData[key] || ""}
              onChange={(e) =>
                handleChange(
                  key,
                  typeof formData[key] === "number" ? Number(e.target.value) : e.target.value
                )
              }
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-3 py-2 border"
            />
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Update any necessary fields above and submit your revisions.
      </p>
      <button
        onClick={handleSubmit}
        className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
      >
        Save & Resubmit
      </button>
    </div>
  );
}
