import React, { useState } from "react";
import { useAuth } from "../components/AuthContext";
import FormattedDataViewer from "../components/FormattedDataViewer";

export default function Home() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const { user } = useAuth();

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/requests/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data);
      } else {
        const err = await res.text();
        setError(err);
      }
    } catch (e) {
      setError("Failed to connect to the backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Submit a Proposal</h1>
      
      {!user && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <p className="text-sm text-yellow-700">Please login from the navigation bar to submit a request contextually, though the API allows it anyway.</p>
        </div>
      )}

      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Upload a proposal document (PDF, DOCX, TXT)
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="flex text-sm text-gray-600 justify-center">
                  <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                    <span>Upload a file</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".pdf,.docx,.txt" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
                <p className="text-xs text-gray-500">{file ? file.name : "No file selected"}</p>
              </div>
            </div>
          </div>
          <button
            type="submit"
            disabled={!file || loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
          >
            {loading ? "Processing..." : "Submit"}
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className="bg-green-50 border-l-4 border-green-400 p-4">
            <p className="text-sm text-green-700 font-bold">Request #{result.id} created — type: {result.request_type}</p>
          </div>

          <div className="bg-white shadow sm:rounded-lg px-4 py-5">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Routing Visualization</h3>
            <div className="flex items-center space-x-2">
              {result.approval_steps.map((step, idx) => (
                <div key={idx} className="flex items-center">
                  <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
                    {step.stakeholder_role}
                  </span>
                  {idx < result.approval_steps.length - 1 && (
                    <span className="text-gray-400 mx-2">➔</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white shadow sm:rounded-lg px-4 py-5">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Raw Text</h3>
              <div className="bg-gray-50 p-4 rounded-md h-96 overflow-y-auto whitespace-pre-wrap text-sm text-gray-700 border border-gray-200">
                {result.raw_text}
              </div>
            </div>
            
            <div className="bg-white shadow sm:rounded-lg px-4 py-5 space-y-4">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Extracted Data</h3>
              
              {result.extracted_json.compliance_flags && result.extracted_json.compliance_flags.length > 0 ? (
                <div className="bg-orange-50 border-l-4 border-orange-400 p-4">
                  <p className="text-sm text-orange-700 font-bold">Compliance Flags:</p>
                  <ul className="list-disc pl-5 text-sm text-orange-700">
                    {result.extracted_json.compliance_flags.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                </div>
              ) : (
                <div className="bg-green-50 border-l-4 border-green-400 p-3">
                  <p className="text-sm text-green-700">No compliance flags.</p>
                </div>
              )}

              <FormattedDataViewer data={result.extracted_json} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
