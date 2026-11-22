using System;
using System.Globalization;
using System.Linq;
using Microsoft.AspNetCore.Builder;

namespace Calcpad.Server.Services
{
    /// <summary>Sets CurrentUICulture from Accept-Language; CurrentCulture (math/output numbers) is left alone.</summary>
    public static class UiCultureMiddleware
    {
        private static readonly string[] Supported = ["en", "bg", "zh", "pt-BR"];

        public static IApplicationBuilder UseUiCulture(this IApplicationBuilder app) =>
            app.Use(async (context, next) =>
            {
                var culture = Match(context.Request.Headers.AcceptLanguage.ToString());
                if (culture is not null)
                    CultureInfo.CurrentUICulture = culture;
                await next();
            });

        private static CultureInfo? Match(string header)
        {
            foreach (var part in header.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                var tag = part.Split(';')[0].Trim();
                if (tag.Length == 0 || tag == "*") continue;
                var normalized = tag.Replace('_', '-');
                var match = Supported.FirstOrDefault(candidate =>
                    string.Equals(normalized, candidate, StringComparison.OrdinalIgnoreCase) ||
                    normalized.StartsWith(candidate + "-", StringComparison.OrdinalIgnoreCase) ||
                    (candidate == "pt-BR" && string.Equals(normalized, "pt", StringComparison.OrdinalIgnoreCase)));
                if (match is not null)
                    return CultureInfo.GetCultureInfo(match);
            }
            return null;
        }
    }
}
