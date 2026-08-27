using System.Net;
using System.Net.Mail;
using backend.Models;
using Microsoft.Extensions.Options;

namespace backend.EmailServicios;

public class SmtpEmailServicio : IEmailServicio
{
    private readonly SmtpSettings _settings;

    public SmtpEmailServicio(IOptions<SmtpSettings> options)
    {
        _settings = options.Value;
    }

    public async Task EnviarAsync(
        string destinatario,
        string asunto,
        string contenido,
        bool contenidoHtml = false,
        CancellationToken cancellationToken = default)
    {
        ValidarConfiguracion();

        using var mensaje = new MailMessage
        {
            From = new MailAddress(_settings.From, _settings.FromName),
            Subject = asunto,
            Body = contenido,
            IsBodyHtml = contenidoHtml
        };
        mensaje.To.Add(new MailAddress(destinatario));

        using var cliente = new SmtpClient(_settings.Host, _settings.Port)
        {
            EnableSsl = _settings.EnableSsl,
            UseDefaultCredentials = false,
            Credentials = new NetworkCredential(_settings.Username, _settings.Password)
        };

        cancellationToken.ThrowIfCancellationRequested();
        await cliente.SendMailAsync(mensaje, cancellationToken);
    }

    private void ValidarConfiguracion()
    {
        if (string.IsNullOrWhiteSpace(_settings.Host) ||
            string.IsNullOrWhiteSpace(_settings.Username) ||
            string.IsNullOrWhiteSpace(_settings.Password) ||
            string.IsNullOrWhiteSpace(_settings.From) ||
            _settings.Password == "CONFIGURE_VIA_USER_SECRETS_OR_ENVIRONMENT")
        {
            throw new InvalidOperationException("La configuración SMTP no está completa.");
        }
    }
}