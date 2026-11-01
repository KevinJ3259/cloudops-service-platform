
using CloudOps.Api.Data;
using CloudOps.Api.Services;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("CloudOpsFrontend", policy =>
    {
        policy.WithOrigins(
                "https://cloudops-frontend-3jpr.onrender.com",
                "http://localhost:5173"
            )
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddControllers();
builder.Services.AddOpenApi();

// PostgreSQL database connection
var connectionString =
    builder.Configuration.GetConnectionString("DefaultConnection")
    ?? builder.Configuration["DATABASE_URL"];

if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "A PostgreSQL connection string is required.");
}

builder.Services.AddDbContext<CloudOpsDbContext>(options =>
    options.UseNpgsql(connectionString)
);

// Automatic incident escalation
builder.Services.AddHostedService<AutomaticEscalationBackgroundService>();

// Allow local React development and deployed frontend
var allowedOrigins = new List<string>
{
    "http://localhost:5173",
    "https://cloudops-frontend-3jpr.onrender.com"
};

var frontendUrl = builder.Configuration["FRONTEND_URL"];

if (!string.IsNullOrWhiteSpace(frontendUrl))
{
    allowedOrigins.Add(frontendUrl.TrimEnd('/'));
}

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy
            .WithOrigins(allowedOrigins.ToArray())
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// Support HTTPS reverse proxies
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders =
        ForwardedHeaders.XForwardedFor |
        ForwardedHeaders.XForwardedProto;

    // Trust only the known hosting proxy network in production.
    // Configure KnownProxies/KnownNetworks for your deployment.
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseForwardedHeaders();

if (app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors("Frontend");

app.MapControllers();

app.Run();
