/**
 * Mensajes en español para el usuario. Centralizado para que el copy
 * sea fácil de revisar y mantener consistente.
 */
export const AUTH_MESSAGES = {
  // Success
  signUpSuccessTitle: "¡Listo!",
  signUpSuccessDescription:
    "Tu cuenta está creada y protegida con Passkey. Ahora configuremos tu primer ciclo.",

  // Passkey
  passkeyVerifyError:
    "No pudimos verificarte. La verificación con Passkey se canceló o expiró.",
  passkeyNetworkError: "Sin conexión. Revisa tu internet e intenta de nuevo.",
  passkeyExpired: "La verificación expiró. Intenta de nuevo.",

  // Email/password
  userNotFound: "No encontramos una cuenta con ese correo.",
  invalidCredentials: "Correo o contraseña incorrectos.",
  emailTaken: "Ya existe una cuenta con ese correo. Inicia sesión.",

  // Genérico
  unknown: "Algo salió mal. Intenta de nuevo.",

  // CTAs
  retry: "Reintentar",
  useOtherMethod: "Usar otro método",
  configureMyCycle: "Configurar mi ciclo",
  createAccount: "Crear cuenta",
  signIn: "Iniciar sesión",
  signUp: "Crear con Passkey",
  emailLabel: "Correo",
  passwordLabel: "Contraseña",
  emailPlaceholder: "tu@correo.com",
  passkeyNotSupported: "Tu dispositivo no soporta Passkeys",
} as const;
