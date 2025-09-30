# Configuración de Email para EduBooks

## Configuración Actual

Por defecto, la aplicación está configurada para mostrar los emails en la consola del servidor Django (modo desarrollo).

## Cambiar a Envío de Emails Reales

Para enviar emails reales, sigue estos pasos:

### 1. Configurar Variables de Entorno

Edita el archivo `.env` y cambia:

```bash
EMAIL_MODE=smtp
```

### 2. Configurar Proveedor SMTP

Descomenta y configura las variables según tu proveedor de email:

#### Para Gmail:
```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=tu_email@gmail.com
EMAIL_HOST_PASSWORD=tu_app_password
```

**Nota para Gmail:** Necesitas generar una "Contraseña de aplicación" en tu cuenta de Google:
1. Ve a tu cuenta de Google > Seguridad
2. Activa la verificación en 2 pasos
3. Genera una contraseña de aplicación
4. Usa esa contraseña en `EMAIL_HOST_PASSWORD`

#### Para SendGrid:
```bash
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=tu_sendgrid_api_key
```

#### Para Outlook/Hotmail:
```bash
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=tu_email@outlook.com
EMAIL_HOST_PASSWORD=tu_password
```

### 3. Reiniciar el Servidor

Después de hacer los cambios, reinicia el servidor Django:

```bash
python manage.py runserver
```

### 4. Personalizar el Remitente

Puedes cambiar el email del remitente editando:

```bash
DEFAULT_FROM_EMAIL=tu_email@tudominio.com
```

## Volver al Modo Desarrollo

Para volver a mostrar emails en consola:

```bash
EMAIL_MODE=console
```

## Verificar Configuración

Los logs del servidor mostrarán si hay errores en la configuración SMTP. Revisa la consola del servidor Django para ver mensajes de error o confirmación de envío.

## Proveedores Recomendados

1. **Gmail**: Fácil de configurar, límite de 500 emails/día
2. **SendGrid**: Servicio profesional, 100 emails/día gratis
3. **Mailgun**: Alternativa robusta para aplicaciones
4. **Amazon SES**: Económico para grandes volúmenes

## Solución de Problemas

- **Error de autenticación**: Verifica usuario y contraseña
- **Error de conexión**: Revisa HOST y PORT
- **Emails no llegan**: Verifica que no estén en spam
- **Límites excedidos**: Algunos proveedores tienen límites diarios