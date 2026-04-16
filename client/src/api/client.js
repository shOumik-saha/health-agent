import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

let token = localStorage.getItem("health_agent_token") || "";

export function setToken(nextToken) {
  token = nextToken || "";
  if (token) {
    localStorage.setItem("health_agent_token", token);
  } else {
    localStorage.removeItem("health_agent_token");
  }
}

export function getToken() {
  return token;
}

api.interceptors.request.use((config) => {
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function register(payload) {
  const { data } = await api.post("/auth/register", payload);
  if (data?.token) setToken(data.token);
  return data;
}

export async function login(payload) {
  const { data } = await api.post("/auth/login", payload);
  if (data?.token) setToken(data.token);
  return data;
}

export async function getMe() {
  const { data } = await api.get("/me");
  return data;
}

export async function createLog(payload) {
  const { data } = await api.post("/logs", payload);
  return data;
}

export async function getLogs(days = 30) {
  const { data } = await api.get("/logs", { params: { days } });
  return data;
}

export async function getTrends(days = 30) {
  const { data } = await api.get("/insights/trends", { params: { days } });
  return data;
}

export async function generateWeekly(days = 30) {
  const { data } = await api.post("/insights/weekly", null, { params: { days } });
  return data;
}

export async function getInsightHistory() {
  const { data } = await api.get("/insights/history");
  return data;
}

export default api;
