import React, { useState } from "react";
import { useNavigate, Link } from "react-router";
import {
    Container, TextField, Button, Typography, Box,
    Alert, CircularProgress, Fade, Card, CardContent,
    InputAdornment,
} from "@mui/material";
import { Person, Lock, Email, Badge } from "@mui/icons-material";
import { api } from "../api/client";
import AppIcon from "../components/icons/AppIcon";
import { useDocumentTitle } from "../hooks/useDocumentTitle/useDocumentTitle";
import useNotifications from "../hooks/useNotifications/useNotifications";

export default function RegisterPage() {
    useDocumentTitle("Регистрация | SkyPath Service");
    const notifications = useNotifications();

    const [form, setForm] = useState({
        username: "",
        password: "",
        confirmPassword: "",
        email: "",
        first_name: "",
        last_name: "",
        middle_name: "",
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
        setError("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (form.password !== form.confirmPassword) {
            setError("Пароли не совпадают");
            return;
        }
        try {
            setLoading(true);
            await api.auth.register({
                username: form.username,
                password: form.password,
                email: form.email,
                first_name: form.first_name,
                last_name: form.last_name,
                middle_name: form.middle_name || undefined,
            });
            navigate("/login");
            notifications.show("Аккаунт зарегистрирован", {
                severity: "success",
                autoHideDuration: 3000,
            });
        } catch (err: any) {
            if (err.status === 409) {
                setError("Пользователь с таким именем или email уже существует.");
            } else if (err.status === 400) {
                setError(err.message || "Проверьте правильность заполнения полей.");
            } else {
                setError("Ошибка при регистрации. Попробуйте позже.");
            }
        } finally {
            setLoading(false);
        }
    };

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
            <Container maxWidth={false} sx={{ maxWidth: 650, position: "relative" }}>
                <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                    minHeight="100vh"
                    gap={2}
                >
                    <Fade in={true} timeout={1000}>
                        <Card sx={{ width: "100%", p: 4, pt: 5, pb: 5, boxShadow: 5, borderRadius: 3 }}>
                            <CardContent>
                                <AppIcon />
                                <Typography variant="h5" sx={{ mt: 2, mb: 2, textAlign: "left" }}>
                                    Регистрация
                                </Typography>

                                {error && (
                                    <Alert severity="error" sx={{ mb: 2 }}>
                                        {error}
                                    </Alert>
                                )}

                                <form onSubmit={handleSubmit}>
                                    {/* Личные данные */}
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3, fontWeight: 500 }}>
                                        Личные данные
                                    </Typography>
                                    <Box display="grid" gridTemplateColumns="1fr 1fr" gap={3}>
                                        <TextField
                                            label="Фамилия" required fullWidth margin="none"
                                            value={form.last_name} onChange={set("last_name")}
                                            placeholder="Иванов"
                                            InputProps={{ startAdornment: <InputAdornment position="start"><Badge color="action" /></InputAdornment> }}
                                        />
                                        <TextField
                                            label="Имя" required fullWidth margin="none"
                                            value={form.first_name} onChange={set("first_name")}
                                            placeholder="Иван"
                                            InputProps={{ startAdornment: <InputAdornment position="start"><Badge color="action" /></InputAdornment> }}
                                        />
                                        <TextField
                                            label="Отчество" fullWidth margin="none"
                                            value={form.middle_name} onChange={set("middle_name")}
                                            placeholder="Иванович"
                                            InputProps={{ startAdornment: <InputAdornment position="start"><Badge color="action" /></InputAdornment> }}
                                        />
                                        <TextField
                                            label="Email" required fullWidth margin="none" type="email"
                                            value={form.email} onChange={set("email")}
                                            placeholder="ivan@example.com"
                                            InputProps={{ startAdornment: <InputAdornment position="start"><Email color="action" /></InputAdornment> }}
                                        />
                                    </Box>

                                    {/* Данные для входа */}
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 3, fontWeight: 500 }}>
                                        Данные для входа
                                    </Typography>
                                    <Box display="grid" gridTemplateColumns="1fr 1fr" gap={3}>
                                        <Box gridColumn="1 / -1">
                                            <TextField
                                                label="Имя пользователя" required fullWidth margin="none"
                                                value={form.username} onChange={set("username")}
                                                placeholder="ivan_ivanov"
                                                InputProps={{ startAdornment: <InputAdornment position="start"><Person color="action" /></InputAdornment> }}
                                            />
                                        </Box>
                                        <TextField
                                            label="Пароль" required fullWidth margin="none" type="password"
                                            value={form.password} onChange={set("password")}
                                            placeholder="Минимум 8 символов"
                                            InputProps={{ startAdornment: <InputAdornment position="start"><Lock color="action" /></InputAdornment> }}
                                        />
                                        <TextField
                                            label="Повторите пароль" required fullWidth margin="none" type="password"
                                            value={form.confirmPassword} onChange={set("confirmPassword")}
                                            placeholder="Повторите пароль"
                                            error={!!form.confirmPassword && form.password !== form.confirmPassword}
                                            helperText={
                                                form.confirmPassword && form.password !== form.confirmPassword
                                                    ? "Пароли не совпадают" : ""
                                            }
                                            InputProps={{ startAdornment: <InputAdornment position="start"><Lock color="action" /></InputAdornment> }}
                                        />
                                    </Box>

                                    <Button
                                        variant="contained" color="primary" fullWidth
                                        type="submit" sx={{ mt: 3 }}
                                        disabled={
                                            !form.username || !form.password || !form.email ||
                                            !form.first_name || !form.last_name ||
                                            form.password !== form.confirmPassword || loading
                                        }
                                        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
                                    >
                                        {loading ? "Регистрация..." : "Зарегистрироваться"}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </Fade>

                    <Typography variant="body2" align="center" sx={{ mt: 1, color: "#757575" }}>
                        Уже есть аккаунт?{" "}
                        <Link to="/login" style={{ color: "#014488", textDecoration: "none", fontWeight: 500 }}>
                            Войти
                        </Link>
                    </Typography>

                    <Typography
                        variant="body2" align="center"
                        sx={{ color: "#9e9e9e", fontSize: "0.75rem", opacity: 0.5, mt: 1, mb: 2 }}
                    >
                        © 2026 SkyPath Service
                    </Typography>
                </Box>
            </Container>
        </Box>
    );
}