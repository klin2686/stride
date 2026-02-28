"use client";

import { createTheme } from "@mui/material/styles";

const theme = createTheme({
    palette: {
        background: {
            default: "#f2f2f2",
        },
    },
    typography: {
        fontFamily: "var(--font-geist-sans), Arial, Helvetica, sans-serif",
    },
});

export default theme;
