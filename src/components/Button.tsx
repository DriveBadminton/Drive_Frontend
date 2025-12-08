import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "danger";
    size?: "sm" | "md" | "lg";
    fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = "primary",
    size = "md",
    fullWidth = false,
    className = "",
    ...props
}) => {
    const baseStyles =
        "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

    const variants = {
        primary:
            "bg-linear-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/30 focus:ring-green-500 border border-transparent",
        secondary:
            "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-500 shadow-sm",
        danger:
            "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 shadow-lg shadow-red-500/30",
    };

    const sizes = {
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2 text-base",
        lg: "px-6 py-3 text-lg",
    };

    const widthClass = fullWidth ? "w-full" : "";

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};
