var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddHttpClient();
builder.Services.Configure<backend.Models.AppsScriptSettings>(builder.Configuration.GetSection("AppsScript"));
builder.Services.Configure<backend.Models.SmtpSettings>(builder.Configuration.GetSection("Smtp"));
builder.Services.AddScoped<backend.EmailServicios.IEmailServicio, backend.EmailServicios.SmtpEmailServicio>();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AngularDevelopment", policy =>
        policy.WithOrigins("http://localhost:4200")
            .AllowAnyHeader()
            .AllowAnyMethod());
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("AngularDevelopment");

app.MapControllers();

app.Run();
