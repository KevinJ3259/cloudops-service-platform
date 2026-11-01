
# Build the ASP.NET Core API
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build

WORKDIR /src

COPY CloudOps.Api.csproj ./
RUN dotnet restore CloudOps.Api.csproj

COPY . ./

RUN dotnet publish CloudOps.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

# Run the published API
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final

WORKDIR /app

COPY --from=build /app/publish ./

ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://0.0.0.0:10000

EXPOSE 10000

ENTRYPOINT ["dotnet", "CloudOps.Api.dll"]
