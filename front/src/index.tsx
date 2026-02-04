
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { StyledEngineProvider } from '@mui/material/styles';
import App from './CrudDashboard';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import "leaflet/dist/leaflet.css";
import "./index.css"

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StyledEngineProvider injectFirst>
      <App />
    </StyledEngineProvider>
  </React.StrictMode>
);

dayjs.locale('ru');