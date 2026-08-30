import React from "react";
import { useAuth } from "./AuthContext";

export default function LoginModal({ isOpen, onClose }) {
  const { login } = useAuth();

  if (!isOpen) return null;

  const users = [
    { username: "student1", role: "Student", name: "Aditya R" },
    { username: "advisor1", role: "Faculty Advisor", name: "Dr. Kamath" },
    { username: "hod1", role: "HOD", name: "Dr. Shenoy" },
    { username: "dean1", role: "Dean SWO", name: "Dr. Bhat" },
    { username: "deanrd1", role: "Dean R&D", name: "Dr. Pai" },
    { username: "director1", role: "Director", name: "Dr. Udaykumar" },
  ];

  const handleLogin = (username) => {
    login(username);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          aria-hidden="true"
          onClick={onClose}
        ></div>

        {/* Modal panel */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full z-10">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Quick Demo Login
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Select a persona to simulate logging in via IRIS SSO:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {users.map((u) => (
                    <button
                      key={u.username}
                      onClick={() => handleLogin(u.username)}
                      className="w-full inline-flex justify-between items-center px-4 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-indigo-50 hover:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <span className="font-bold text-left">{u.name}</span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{u.role}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
