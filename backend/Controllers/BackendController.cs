using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using backend.Models;

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
}
