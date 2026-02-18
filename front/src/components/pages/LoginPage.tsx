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
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { api } from "../../api/client";
import AppIcon from "../AppIcon";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  const handleLogin = async () => {
    setError("");
    try {
      setLoading(true);
      await api.auth.login(username, password);
      navigate("/trajectories");
    } catch (err: any) {
      if (err.status === 401) {
        setError("Неверное имя пользователя или пароль.");
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

  return (
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
        <Card sx={{ width: "100%", p: 4, pt: 5, pb: 7, boxShadow: 5 }}>
          <CardContent>
            {/* Иконка с названием по центру */}
            <AppIcon />
            {/* Заголовок "Вход" слева */}
            <Typography variant="h4" sx={{ mt: 2, mb: 2, textAlign: "left" }}>
              Вход
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
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
                margin="normal"
                inputRef={usernameRef}
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
                margin="normal"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={togglePasswordVisibility} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                variant="contained"
                color="primary"
                fullWidth
                type="submit"
                sx={{ mt: 3 }}
                disabled={!username || !password || loading}
              >
                Войти
              </Button>
            </form>
          </CardContent>
        </Card>
      </Box>

      <Fade in={loading} timeout={300}>
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
      </Fade>
    </Container>
  );
}
