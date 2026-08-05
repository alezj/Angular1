using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BackendController : ControllerBase
    {
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
    }
}
