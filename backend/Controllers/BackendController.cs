using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using backend.Models;
using System.Net.Http.Json;
using System.Text.Json;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BackendController : ControllerBase
    {
        private readonly HttpClient _httpClient;
        private readonly AppsScriptSettings _appsScriptSettings;

        public BackendController(HttpClient httpClient, IOptions<AppsScriptSettings> appsScriptOptions)
        {
            _httpClient = httpClient;
            _appsScriptSettings = appsScriptOptions.Value;
        }

        [HttpGet("status")]
        public IActionResult GetStatus()
        {
            return Ok(new
            {
                status = "Backend activo",
                timestamp = DateTime.UtcNow
            });
        }

        [HttpGet("weather")]
        public IActionResult GetWeather()
        {
            var summaries = new[]
            {
                "Freezing",
                "Bracing",
                "Chilly",
                "Cool",
                "Mild",
                "Warm",
                "Balmy",
                "Hot",
                "Sweltering",
                "Scorching"
            };

            var forecast = Enumerable.Range(1, 5).Select(index => new
            {
                Date = DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
                TemperatureC = Random.Shared.Next(-20, 55),
                Summary = summaries[Random.Shared.Next(summaries.Length)]
            });

            return Ok(forecast);
        }

        [HttpGet("inquilinos")]
        public async Task<IActionResult> GetInquilinos()
        {
            var baseUrl = _appsScriptSettings.BaseUrl;
            if (string.IsNullOrWhiteSpace(baseUrl))
            {
                return BadRequest(new { error = "La URL de Apps Script no esta configurada." });
            }

            var scriptUrl = $"{baseUrl}{(baseUrl.Contains('?') ? "&" : "?")}resource=inquilinos";
            using var response = await _httpClient.GetAsync(scriptUrl);
            var content = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return StatusCode((int)response.StatusCode, new { error = "Fallo al llamar a Google Apps Script." });
            }

            return Content(content, response.Content.Headers.ContentType?.ToString() ?? "application/json");
        }

        [HttpGet("pagos")]
        public async Task<IActionResult> GetPagos()
        {
            var baseUrl = _appsScriptSettings.BaseUrl;
            if (string.IsNullOrWhiteSpace(baseUrl))
            {
                return BadRequest(new { error = "La URL de Apps Script no esta configurada." });
            }

            var scriptUrl = $"{baseUrl}{(baseUrl.Contains('?') ? "&" : "?")}resource=pagos";
            using var response = await _httpClient.GetAsync(scriptUrl);
            var content = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return StatusCode((int)response.StatusCode, new { error = "Fallo al llamar a Google Apps Script." });
            }

            return Content(content, response.Content.Headers.ContentType?.ToString() ?? "application/json");
        }

        [HttpGet("propiedades")]
        public async Task<IActionResult> GetPropiedades()
        {
            var baseUrl = _appsScriptSettings.BaseUrl;
            if (string.IsNullOrWhiteSpace(baseUrl))
            {
                return BadRequest(new { error = "La URL de Apps Script no esta configurada." });
            }

            var scriptUrl = $"{baseUrl}{(baseUrl.Contains('?') ? "&" : "?")}resource=propiedades";
            using var response = await _httpClient.GetAsync(scriptUrl);
            var content = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return StatusCode((int)response.StatusCode, new { error = "Fallo al llamar a Google Apps Script." });
            }

            return Content(content, response.Content.Headers.ContentType?.ToString() ?? "application/json");
        }

        [HttpPost("propiedades")]
        public Task<IActionResult> CrearPropiedad([FromBody] PropiedadRequest datos) => EnviarAccion("create", null, datos);

        [HttpPut("propiedades/{id}")]
        public Task<IActionResult> ActualizarPropiedad(string id, [FromBody] PropiedadRequest datos) => EnviarAccion("update", id, datos);

        [HttpDelete("propiedades/{id}")]
        public Task<IActionResult> EliminarPropiedad(string id) => EnviarAccion("delete", id, null);

        [HttpPost("{resource}")]
        public Task<IActionResult> CrearRegistro(string resource, [FromBody] JsonElement data) => EnviarAccionGenerica(resource, "create", null, data);

        [HttpPut("{resource}/{id}")]
        public Task<IActionResult> ActualizarRegistro(string resource, string id, [FromBody] JsonElement data) => EnviarAccionGenerica(resource, "update", id, data);

        [HttpDelete("{resource}/{id}")]
        public Task<IActionResult> EliminarRegistro(string resource, string id) => EnviarAccionGenerica(resource, "delete", id, null);

        private async Task<IActionResult> EnviarAccionGenerica(string resource, string action, string? id, JsonElement? data)
        {
            var recursos = new[] { "inquilinos", "pagos", "mantenimientos", "alquileres" };
            if (!recursos.Contains(resource)) return NotFound(new { error = "Recurso no permitido." });
            if (string.IsNullOrWhiteSpace(_appsScriptSettings.BaseUrl)) return BadRequest(new { error = "La URL de Apps Script no esta configurada." });
            using var response = await _httpClient.PostAsJsonAsync(_appsScriptSettings.BaseUrl, new { resource, action, id, data });
            var content = await response.Content.ReadAsStringAsync();
            return response.IsSuccessStatusCode ? Content(content, response.Content.Headers.ContentType?.ToString() ?? "application/json") : StatusCode((int)response.StatusCode, new { error = "Fallo al llamar a Google Apps Script." });
        }

        private async Task<IActionResult> EnviarAccion(string action, string? id, PropiedadRequest? datos)
        {
            if (string.IsNullOrWhiteSpace(_appsScriptSettings.BaseUrl)) return BadRequest(new { error = "La URL de Apps Script no esta configurada." });
            var data = datos is null ? null : new { datos.nombre, datos.direccion, PrecioMensual = datos.precioMensual, datos.notas, datos.estado };
            using var response = await _httpClient.PostAsJsonAsync(_appsScriptSettings.BaseUrl, new { resource = "propiedades", action, id, data });
            var content = await response.Content.ReadAsStringAsync();
            return response.IsSuccessStatusCode
                ? Content(content, response.Content.Headers.ContentType?.ToString() ?? "application/json")
                : StatusCode((int)response.StatusCode, new { error = "Fallo al llamar a Google Apps Script." });
        }

        [HttpGet("mantenimientos")]
        public async Task<IActionResult> GetMantenimientos()
        {
            var baseUrl = _appsScriptSettings.BaseUrl;
            if (string.IsNullOrWhiteSpace(baseUrl))
            {
                return BadRequest(new { error = "La URL de Apps Script no esta configurada." });
            }

            var scriptUrl = $"{baseUrl}{(baseUrl.Contains('?') ? "&" : "?")}resource=mantenimientos";
            using var response = await _httpClient.GetAsync(scriptUrl);
            var content = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return StatusCode((int)response.StatusCode, new { error = "Fallo al llamar a Google Apps Script." });
            }

            return Content(content, response.Content.Headers.ContentType?.ToString() ?? "application/json");
        }

        [HttpGet("alquileres")]
        public async Task<IActionResult> GetAlquileres()
        {
            var baseUrl = _appsScriptSettings.BaseUrl;
            if (string.IsNullOrWhiteSpace(baseUrl))
            {
                return BadRequest(new { error = "La URL de Apps Script no esta configurada." });
            }

            var scriptUrl = $"{baseUrl}{(baseUrl.Contains('?') ? "&" : "?")}resource=alquileres";
            using var response = await _httpClient.GetAsync(scriptUrl);
            var content = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return StatusCode((int)response.StatusCode, new { error = "Fallo al llamar a Google Apps Script." });
            }

            return Content(content, response.Content.Headers.ContentType?.ToString() ?? "application/json");
        }

        [HttpGet("apps-script")]
        public async Task<IActionResult> GetAppsScriptData()
        {
            var scriptUrl = _appsScriptSettings.BaseUrl;
            if (string.IsNullOrWhiteSpace(scriptUrl))
            {
                return BadRequest(new { error = "La URL de Apps Script no está configurada." });
            }

            var request = new HttpRequestMessage(HttpMethod.Get, scriptUrl);
            var response = await _httpClient.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                return StatusCode((int)response.StatusCode, new { error = "Fallo al llamar a Google Apps Script." });
            }

            var content = await response.Content.ReadAsStringAsync();
            return Content(content, response.Content.Headers.ContentType?.ToString() ?? "application/json");
        }
    }

    public class PropiedadRequest
    {
        public string nombre { get; set; } = "";
        public string direccion { get; set; } = "";
        public decimal precioMensual { get; set; }
        public string notas { get; set; } = "";
        public int? estado { get; set; }
    }
}
