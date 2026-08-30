import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("iris_user");
    if (saved) {
      setUser(JSON.parse(saved));
    }
  }, []);

  const login = async (username) => {
    try {
      const res = await fetch("http://localhost:8000/auth/iris_stub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      if (res.ok) {
        const data = await res.json();
        const userData = { ...data, username };
        setUser(userData);
        localStorage.setItem("iris_user", JSON.stringify(userData));
      } else {
        alert("Login failed");
      }
    } catch (e) {
      alert("Error connecting to backend");
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("iris_user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
