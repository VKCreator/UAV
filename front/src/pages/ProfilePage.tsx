import * as React from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Avatar,
  Chip,
  Divider,
  Alert,
  IconButton,
  Tooltip,
  Skeleton,
  Stack
} from "@mui/material";

import PersonIcon from "@mui/icons-material/Person";
import EmailIcon from "@mui/icons-material/Email";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import FlightIcon from "@mui/icons-material/Flight";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import RefreshIcon from "@mui/icons-material/Refresh";
import BadgeIcon from "@mui/icons-material/Badge";

import { api } from "../api/client";
import useNotifications from "../hooks/useNotifications/useNotifications";
import { useDocumentTitle } from "../hooks/useDocumentTitle/useDocumentTitle";
import PageContainer from "../components/layout/PageContainer";

interface UserProfile {
  user_id: number;
  username: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

const ACCENT = "#014488";

const InfoRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}> = ({ icon, label, value }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "flex-start",
      gap: 2,
      py: 1.5,
    }}
  >
    <Box
      sx={{
        color: ACCENT,
        display: "flex",
        alignItems: "center",
        mt: "2px",
        flexShrink: 0,
      }}
    >
      {icon}
    </Box>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", lineHeight: 1.2, mb: 0.25 }}
      >
        {label}
      </Typography>
      <Typography
        variant="body1"
        component="div"
        sx={{ fontWeight: 500, wordBreak: "break-word" }}
      >
        {value}
      </Typography>
    </Box>
  </Box>
);

const CACHE_KEY = "profile-cache-v1";
const CACHE_TTL_MS = 30 * 60 * 1000; // 5 минут

interface ProfileCache {
  data: UserProfile;
  cachedAt: number;
}

const ProfilePage: React.FC = () => {
  const notifications = useNotifications();
  useDocumentTitle("Профиль | SkyPath Service");
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchProfile = React.useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);

      try {
        const data = await api.users.getMe();

        // Сохраняем в кэш
        const cache: ProfileCache = { data, cachedAt: Date.now() };
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));

        setUser(data);
      } catch (err) {
        // При фоновом обновлении — не показываем ошибку, просто тихо fail
        if (!silent) {
          const message =
            err instanceof Error
              ? err.message
              : "Не удалось загрузить данные профиля";
          setError(message);
          notifications.show(message, {
            severity: "error",
            autoHideDuration: 5000,
          });
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [notifications],
  );

  React.useEffect(() => {
    // Пробуем отдать кэш мгновенно
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (raw) {
      try {
        const cache: ProfileCache = JSON.parse(raw);
        setUser(cache.data);
        setLoading(false);

        // Если кэш свежий — фоновое обновление, иначе явное
        const isStale = Date.now() - cache.cachedAt > CACHE_TTL_MS;
        fetchProfile(/* silent= */ !isStale);
        return;
      } catch {
        sessionStorage.removeItem(CACHE_KEY);
      }
    }

    // Кэша нет — обычная загрузка
    fetchProfile(false);
  }, [fetchProfile]);

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleString("ru-RU", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  const getInitials = (u: UserProfile) => {
    const f = u.first_name?.charAt(0) ?? "";
    const l = u.last_name?.charAt(0) ?? "";
    return (f + l).toUpperCase() || "?";
  };

  const getFullName = (u: UserProfile) =>
    [u.last_name, u.first_name, u.middle_name].filter(Boolean).join(" ");

  return (
    <Box sx={{pl: 20, pr: 20}}>
    <PageContainer
              title={"Профиль пользователя"}
              actions={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Tooltip title="Обновить данные" enterDelay={500}>
                    <span>
                      <IconButton
                        onClick={() => fetchProfile(false)}
                        disabled={loading}
                        color="primary"
                        size="small"
                      >
                        <RefreshIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              }
            >

    <Box
      sx={{
      width: "100%", overflow: "auto"
      }}
    >
      {/* <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
        }}
      >
        <Typography variant="h5" fontWeight={600}>
          Профиль пользователя
        </Typography>

        <Tooltip title="Обновить данные" enterDelay={500}>
          <span>
            <IconButton
              onClick={() => fetchProfile(false)}
              disabled={loading}
              color="primary"
              size="small"
            >
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box> */}

      {/* Ошибка */}
      {error && !loading && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* ── Левая колонка: аватар + краткое резюме ─────────────────────── */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              border: "1px solid #e0e0e0",
              borderRadius: 2,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              textAlign: "center",
            }}
          >
            {loading ? (
              <>
                <Skeleton variant="circular" width={96} height={96} />
                <Skeleton variant="text" width="70%" height={28} />
                <Skeleton variant="text" width="50%" height={20} />
                <Skeleton variant="rounded" width={90} height={24} />
              </>
            ) : user ? (
              <>
                <Avatar
                  sx={{
                    width: 96,
                    height: 96,
                    bgcolor: ACCENT,
                    fontSize: "2rem",
                    fontWeight: 700,
                    letterSpacing: 1,
                  }}
                >
                  {getInitials(user)}
                </Avatar>

                <Box>
                  <Typography
                    variant="h6"
                    fontWeight={700}
                    sx={{ lineHeight: 1.3, width: "200px" }}
                  >
                    {getFullName(user)}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.5 }}
                  >
                    @{user.username}
                  </Typography>
                </Box>

                <Chip
                  size="small"
                  icon={
                    user.is_active ? (
                      <CheckCircleIcon fontSize="small" />
                    ) : (
                      <CancelIcon fontSize="small" />
                    )
                  }
                  label={user.is_active ? "Активен" : "Заблокирован"}
                  color={user.is_active ? "success" : "error"}
                  variant="outlined"
                />

                <Divider flexItem />

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    color: "text.secondary",
                  }}
                >
                  <FlightIcon fontSize="small" sx={{ color: ACCENT }} />
                  <Typography variant="caption">
                    ID пользователя: {user.user_id}
                  </Typography>
                </Box>
              </>
            ) : null}
          </Paper>
        </Grid>

        {/* ── Правая колонка: детальные поля ──────────────────────────────── */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              border: "1px solid #e0e0e0",
              borderRadius: 2,
            }}
          >
            <Typography
              variant="subtitle1"
              fontWeight={600}
              color="text.secondary"
              sx={{
                mb: 1,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                fontSize: "0.75rem",
              }}
            >
              Личные данные
            </Typography>

            <Divider sx={{ mb: 1 }} />

            {loading ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {Array.from({ length: 7 }).map((_, i) => (
                  <Box key={i} sx={{ display: "flex", gap: 2, py: 1 }}>
                    <Skeleton variant="circular" width={22} height={22} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" width="30%" height={14} />
                      <Skeleton variant="text" width="55%" height={22} />
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : user ? (
              <>
                <InfoRow
                  icon={<PersonIcon fontSize="small" />}
                  label="Фамилия"
                  value={user.last_name}
                />
                <Divider />

                <InfoRow
                  icon={<PersonIcon fontSize="small" />}
                  label="Имя"
                  value={user.first_name}
                />
                <Divider />

                <InfoRow
                  icon={<PersonIcon fontSize="small" />}
                  label="Отчество"
                  value={user.middle_name || "—"}
                />
                <Divider />

                <InfoRow
                  icon={<AccountCircleIcon fontSize="small" />}
                  label="Имя пользователя (логин)"
                  value={`@${user.username}`}
                />
                <Divider />

                <InfoRow
                  icon={<EmailIcon fontSize="small" />}
                  label="Электронная почта"
                  value={user.email}
                />
                <Divider />

                <InfoRow
                  icon={<CalendarTodayIcon fontSize="small" />}
                  label="Дата регистрации"
                  value={formatDate(user.created_at)}
                />
                <Divider />

                <InfoRow
                  icon={<BadgeIcon fontSize="small" />}
                  label="Статус аккаунта"
                  value={
                    <Chip
                      size="small"
                      label={user.is_active ? "Активен" : "Заблокирован"}
                      color={user.is_active ? "success" : "error"}
                      variant="outlined"
                      sx={{ mt: 0.25 }}
                    />
                  }
                />
              </>
            ) : !error ? (
              <Typography
                color="text.secondary"
                sx={{ py: 3, textAlign: "center" }}
              >
                Данные пользователя не найдены
              </Typography>
            ) : null}
          </Paper>
        </Grid>
      </Grid>
    </Box>
    </PageContainer>
    </Box>
  );
};

export default ProfilePage;
