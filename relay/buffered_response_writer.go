package relay

import (
	"bufio"
	"bytes"
	"errors"
	"net"
	"net/http"

	"github.com/gin-gonic/gin"
)

type bufferedResponseWriter struct {
	original gin.ResponseWriter
	headers  http.Header
	body     bytes.Buffer
	status   int
	size     int
	written  bool
}

func newBufferedResponseWriter(original gin.ResponseWriter) *bufferedResponseWriter {
	return &bufferedResponseWriter{
		original: original,
		headers:  make(http.Header),
	}
}

func (w *bufferedResponseWriter) Header() http.Header {
	return w.headers
}

func (w *bufferedResponseWriter) WriteHeader(code int) {
	if w.written {
		return
	}
	w.status = code
	w.written = true
}

func (w *bufferedResponseWriter) WriteHeaderNow() {
	if w.written {
		return
	}
	w.status = http.StatusOK
	w.written = true
}

func (w *bufferedResponseWriter) Write(data []byte) (int, error) {
	if !w.written {
		w.WriteHeader(http.StatusOK)
	}
	n, err := w.body.Write(data)
	w.size += n
	return n, err
}

func (w *bufferedResponseWriter) WriteString(s string) (int, error) {
	return w.Write([]byte(s))
}

func (w *bufferedResponseWriter) Status() int {
	return w.status
}

func (w *bufferedResponseWriter) Size() int {
	return w.size
}

func (w *bufferedResponseWriter) Written() bool {
	return w.written
}

func (w *bufferedResponseWriter) Flush() {}

func (w *bufferedResponseWriter) CloseNotify() <-chan bool {
	return w.original.CloseNotify()
}

func (w *bufferedResponseWriter) Pusher() http.Pusher {
	return w.original.Pusher()
}

func (w *bufferedResponseWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	return nil, nil, errors.New("buffered response writer does not support hijack")
}

func (w *bufferedResponseWriter) FlushTo(target gin.ResponseWriter) error {
	if !w.written {
		return nil
	}
	for key, values := range w.headers {
		target.Header().Del(key)
		for _, value := range values {
			target.Header().Add(key, value)
		}
	}
	status := w.status
	if status == 0 {
		status = http.StatusOK
	}
	target.WriteHeader(status)
	if w.body.Len() == 0 {
		return nil
	}
	_, err := target.Write(w.body.Bytes())
	return err
}
