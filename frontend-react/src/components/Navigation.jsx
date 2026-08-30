import { Link, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function Navigation() {
  const location = useLocation();
  const { user, login, logout } = useAuth();

  const links = [
    { href: "/", label: "Submit Proposal" },
    { href: "/queue", label: "My Queue" },
    { href: "/audit", label: "Audit Trail" },
    { href: "/metrics", label: "Metrics" },
  ];

  return (
    <nav className="bg-gray-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 font-bold text-xl">
              NITK Workflow
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      location.pathname === link.href
                        ? "bg-gray-900 text-white"
                        : "text-gray-300 hover:bg-gray-700 hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center">
            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm">
                  Welcome, <strong>{user.name}</strong> ({user.role})
                </span>
                <button
                  onClick={logout}
                  className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="text-sm">Login as:</span>
                <select
                  className="text-black px-2 py-1 rounded text-sm"
                  onChange={(e) => {
                    if (e.target.value) login(e.target.value);
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>Select role</option>
                  <option value="student1">Student</option>
                  <option value="advisor1">Faculty Advisor</option>
                  <option value="hod1">HOD</option>
                  <option value="dean1">Dean SWO</option>
                  <option value="deanrd1">Dean R&D</option>
                  <option value="director1">Director</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
