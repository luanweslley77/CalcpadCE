using Calcpad.Server.Services;

namespace Calcpad.Tests;

/// <summary>
/// The server follows the same locale rules as the frontend: a supported tag or a
/// language-region variant selects the catalog, while a bare ambiguous tag does not.
/// </summary>
public class UiCultureMiddlewareTests
{
    [Theory]
    [InlineData("pt-BR", "pt-BR")]
    [InlineData("pt_BR", "pt-BR")]
    [InlineData("pt-br", "pt-BR")]
    [InlineData("zh-CN", "zh")]
    [InlineData("zh_Hans", "zh")]
    [InlineData("en-US", "en")]
    [InlineData("bg-BG", "bg")]
    [InlineData("fr-FR, pt-BR;q=0.9", "pt-BR")]
    public void Match_SelectsSupportedLocale(string header, string expected)
    {
        Assert.Equal(expected, UiCultureMiddleware.Match(header)?.Name);
    }

    [Theory]
    [InlineData("")]
    [InlineData("*")]
    [InlineData("pt")]
    [InlineData("pt-PT")]
    [InlineData("fr-FR")]
    [InlineData("pt-PT, fr-FR")]
    public void Match_LeavesAmbiguousOrUnsupportedTagsUnset(string header)
    {
        Assert.Null(UiCultureMiddleware.Match(header));
    }
}
