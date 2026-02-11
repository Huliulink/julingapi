package router

import (
	"embed"
	"fmt"
	"net/http"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/controller"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/gin-contrib/gzip"
	"github.com/gin-contrib/static"
	"github.com/gin-gonic/gin"
)

func getBaseURL(c *gin.Context) string {
	scheme := "https"
	if proto := c.GetHeader("X-Forwarded-Proto"); proto != "" {
		scheme = proto
	} else if c.Request.TLS == nil {
		scheme = "http"
	}
	return fmt.Sprintf("%s://%s", scheme, c.Request.Host)
}

func SetWebRouter(router *gin.Engine, buildFS embed.FS, indexPage []byte) {
	router.Use(gzip.Gzip(gzip.DefaultCompression))
	router.Use(middleware.GlobalWebRateLimit())
	router.Use(middleware.Cache())

	router.GET("/robots.txt", func(c *gin.Context) {
		baseURL := getBaseURL(c)
		content := fmt.Sprintf(`User-agent: *
Allow: /
Disallow: /console/
Disallow: /api/

Sitemap: %s/sitemap.xml
`, baseURL)
		c.Data(http.StatusOK, "text/plain; charset=utf-8", []byte(content))
	})

	router.GET("/sitemap.xml", func(c *gin.Context) {
		baseURL := getBaseURL(c)
		content := fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>%s/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>%s/pricing</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>%s/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>%s/privacy-policy</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>%s/user-agreement</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>%s/partner</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>`, baseURL, baseURL, baseURL, baseURL, baseURL, baseURL)
		c.Data(http.StatusOK, "application/xml; charset=utf-8", []byte(content))
	})

	router.Use(static.Serve("/", common.EmbedFolder(buildFS, "web/dist")))
	router.NoRoute(func(c *gin.Context) {
		if strings.HasPrefix(c.Request.RequestURI, "/v1") || strings.HasPrefix(c.Request.RequestURI, "/api") || strings.HasPrefix(c.Request.RequestURI, "/assets") {
			controller.RelayNotFound(c)
			return
		}
		c.Header("Cache-Control", "no-cache")
		c.Data(http.StatusOK, "text/html; charset=utf-8", indexPage)
	})
}
