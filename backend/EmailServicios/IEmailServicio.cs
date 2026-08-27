namespace backend.EmailServicios;

public interface IEmailServicio
{
    Task EnviarAsync(
        string destinatario,
        string asunto,
        string contenido,
        bool contenidoHtml = false,
        CancellationToken cancellationToken = default);
}