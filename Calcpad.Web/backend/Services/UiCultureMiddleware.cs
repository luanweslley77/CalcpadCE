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
                if (culture is null)
                {
                    await next();
                    return;
                }

                var previous = CultureInfo.CurrentUICulture;
                CultureInfo.CurrentUICulture = culture;
                try
                {
                    await next();
                }
                finally
                {
                    CultureInfo.CurrentUICulture = previous;
                }
            });

        internal static CultureInfo? Match(string header)
        {
            foreach (var part in header.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                var tag = part.Split(';')[0].Trim();
                if (tag.Length == 0 || tag == "*") continue;
                var normalized = tag.Replace('_', '-');
                // Bare "pt" is ambiguous (Portugal vs Brazil); require an explicit pt-BR tag.
                var match = Supported.FirstOrDefault(candidate =>
                    string.Equals(normalized, candidate, StringComparison.OrdinalIgnoreCase) ||
                    normalized.StartsWith(candidate + "-", StringComparison.OrdinalIgnoreCase));
                if (match is not null)
                    return CultureInfo.GetCultureInfo(match);
            }
            return null;
        }
    }
}
