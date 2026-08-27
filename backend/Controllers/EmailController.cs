using backend.EmailServicios;
using Microsoft.AspNetCore.Mvc;
using System.Net.Mail;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EmailController : ControllerBase
{
    private readonly IEmailServicio _emailServicio;

    public EmailController(IEmailServicio emailServicio)
    {
        _emailServicio = emailServicio;
    }

    [HttpPost("enviar")]
    public async Task<IActionResult> Enviar([FromBody] EnviarEmailRequest solicitud, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        try
        {
            await _emailServicio.EnviarAsync(
                solicitud.Destinatario,
                solicitud.Asunto,
                solicitud.Contenido,
                solicitud.ContenidoHtml,
                cancellationToken);

            return Ok(new { mensaje = "Correo enviado correctamente." });
        }
        catch (FormatException)
        {
            return BadRequest(new { error = "El destinatario no tiene un formato válido." });
        }
        catch (InvalidOperationException exception)
        {
            return Problem(statusCode: StatusCodes.Status500InternalServerError, detail: exception.Message);
        }
        catch (SmtpException)
        {
            return Problem(statusCode: StatusCodes.Status502BadGateway, detail: "No fue posible enviar el correo mediante SMTP.");
        }
    }
}

public class EnviarEmailRequest
{
    [System.ComponentModel.DataAnnotations.Required]
    [System.ComponentModel.DataAnnotations.EmailAddress]
    public string Destinatario { get; set; } = "";

    [System.ComponentModel.DataAnnotations.Required]
    public string Asunto { get; set; } = "";

    [System.ComponentModel.DataAnnotations.Required]
    public string Contenido { get; set; } = "";

    public bool ContenidoHtml { get; set; }
}