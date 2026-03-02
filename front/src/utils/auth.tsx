import { jwtDecode } from "jwt-decode";

interface JwtUserPayload {
  user: string;
  first_name: string;
  last_name: string;
  middle_name: string;
  email: string;
  active: boolean;
  exp: number;
}

const parseJwtPayload = (token: string): JwtUserPayload | null => {
  try {
    return jwtDecode<JwtUserPayload>(token);
  } catch {
    return null;
  }
};

export const getUserFromStorage = (): JwtUserPayload | null => {
  const token = localStorage.getItem("token");
  if (!token) return null;
  return parseJwtPayload(token);
};
