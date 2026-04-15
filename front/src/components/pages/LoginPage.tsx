import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Fade,
  IconButton,
  InputAdornment,
  Card,
  CardContent,
  Tooltip,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Person,
  Lock,
  Notifications,
} from "@mui/icons-material";
import { api } from "../../api/client";
import AppIcon from "../AppIcon";
import { Link } from "react-router";

import useNotifications from "../../hooks/useNotifications/useNotifications";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();
  const notifications = useNotifications();

  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  const handleLogin = async () => {
    setError("");
    try {
      setLoading(true);
      await api.auth.login(username, password);
      notifications.show("Вход успешно выполнен", {
        severity: "success",
        autoHideDuration: 3000,
      });
      setSuccess(true); // показываем overlay
      setTimeout(() => {
        navigate("/dashboards");
      }, 600); // небольшая пауза для плавности
    } catch (err: any) {
      if (err.status === 401) {
        setError("Неверное имя пользователя или пароль.");
        setPassword("");
        usernameRef.current?.focus();
      } else if (err.status === 500) {
        setError("Ошибка на сервере.");
      } else {
        setError(err.message || "Ошибка входа");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleLogin();
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  // useEffect(() => {
  //   setLoading(true);

  //   const timer = setTimeout(() => {
  //     setLoading(false);
  //     usernameRef.current?.focus();
  //   }, 500); // например 500мс для эффекта загрузки

  //   return () => clearTimeout(timer);
  // }, []);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f5f7fa 0%, #e4ecf3 100%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Container maxWidth="xs" sx={{ position: "relative" }}>
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="100vh"
          gap={2}
        >
          {/* Карточка с формой */}
          <Fade in={true} timeout={1000}>
            <Card
              sx={{
                width: "100%",
                p: 4,
                pt: 5,
                pb: 5,
                boxShadow: 5,
                borderRadius: 3,
              }}
            >
              <CardContent>
                {/* Иконка с названием по центру */}
                <AppIcon />
                {/* Заголовок "Вход" слева */}
                <Typography
                  variant="h5"
                  sx={{ mt: 2, mb: 2, textAlign: "left" }}
                >
                  Вход
                </Typography>

                {error && (
                  <Alert severity="error" sx={{ mb: 2, alignItems: "center" }}>
                    {error}
                  </Alert>
                )}

                <form onSubmit={handleSubmit}>
                  <TextField
                    label="Имя пользователя"
                    required
                    fullWidth
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setError("");
                    }}
                    placeholder="Введите логин..."
                    margin="normal"
                    inputRef={usernameRef}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Person color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    label="Пароль"
                    required
                    type={showPassword ? "text" : "password"}
                    fullWidth
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    onKeyDown={(e) => {
                      setCapsLock(e.getModifierState("CapsLock"));
                    }}
                    onKeyUp={(e) => {
                      setCapsLock(e.getModifierState("CapsLock"));
                    }}
                    onBlur={() => {
                      setCapsLock(false);
                    }}
                    placeholder="Введите пароль..."
                    margin="normal"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <Tooltip
                            title={
                              showPassword ? "Скрыть пароль" : "Показать пароль"
                            }
                          >
                            <IconButton
                              onClick={togglePasswordVisibility}
                              edge="end"
                            >
                              {showPassword ? (
                                <VisibilityOff />
                              ) : (
                                <Visibility />
                              )}
                            </IconButton>
                          </Tooltip>
                        </InputAdornment>
                      ),
                    }}
                  />
                  {capsLock && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ ml: 1 }}
                    >
                      Caps Lock включён
                    </Typography>
                  )}
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    type="submit"
                    sx={{ mt: 2 }}
                    disabled={!username || !password || loading}
                    startIcon={
                      loading ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : null
                    }
                  >
                    {loading ? "Выполняется вход..." : "Войти"}
                  </Button>
                  <Typography
                    variant="body2"
                    align="left"
                    sx={{
                      mt: 4,
                      color: "#757575",
                      fontSize: "0.8rem",
                      opacity: 0.8,
                    }}
                  >
                    Версия: 2026.4.13
                  </Typography>
                </form>
              </CardContent>
            </Card>
          </Fade>
        <Typography variant="body2" align="center" sx={{ mt: 1, color: "#757575" }}>
          Нет аккаунта?{" "}
          <Link to="/register" style={{ color: "#014488", textDecoration: "none", fontWeight: 500 }}>
            Регистрация
          </Link>
        </Typography>
        {/* Футер под карточкой */}
        <Typography
          variant="body2"
          align="center"
          sx={{
            color: "#9e9e9e",
            fontSize: "0.75rem",
            opacity: 0.5,
            mt: 1,
            mb: 2,
          }}
        >
          © 2026 SkyPath Service
        </Typography>
        </Box>
      </Container>

      <Fade in={success} timeout={300}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            bgcolor: "rgba(255, 255, 255, 1)",
            zIndex: 10,
          }}
        >
          <CircularProgress size={60} />
        </Box>
      </Fade>
      {/* <Fade in={loading} timeout={500}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            bgcolor: "rgba(255, 255, 255, 0.7)",
            zIndex: 10,
          }}
        >
          <CircularProgress size={60} />
        </Box>
      </Fade> */}
    </Box>
  );
}
