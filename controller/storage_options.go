package controller

import (
	"fmt"
	"net/http"
	"sort"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/config"
	"github.com/QuantumNous/new-api/setting/storage_setting"

	"github.com/gin-gonic/gin"
)

type StorageOptionUpdateRequest struct {
	Key   string `json:"key"`
	Value any    `json:"value"`
}

func GetStorageOptions(c *gin.Context) {
	cfgMap, err := config.ConfigToMap(storage_setting.GetStorageSetting())
	if err != nil {
		common.ApiError(c, err)
		return
	}

	keys := make([]string, 0, len(cfgMap))
	for k := range cfgMap {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	options := make([]*model.Option, 0, len(cfgMap))
	for _, k := range keys {
		options = append(options, &model.Option{
			Key:   "storage_setting." + k,
			Value: cfgMap[k],
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    options,
	})
}

func UpdateStorageOption(c *gin.Context) {
	var option StorageOptionUpdateRequest
	if err := common.DecodeJson(c.Request.Body, &option); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "invalid request body",
		})
		return
	}

	if !strings.HasPrefix(option.Key, "storage_setting.") {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "only storage_setting.* keys are allowed",
		})
		return
	}

	key := strings.TrimPrefix(option.Key, "storage_setting.")
	cfgMap, err := config.ConfigToMap(storage_setting.GetStorageSetting())
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if _, ok := cfgMap[key]; !ok {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "invalid storage setting key",
		})
		return
	}

	var value string
	switch v := option.Value.(type) {
	case bool:
		value = common.Interface2String(v)
	case float64:
		value = common.Interface2String(v)
	case int:
		value = common.Interface2String(v)
	case string:
		value = v
	default:
		value = fmt.Sprintf("%v", v)
	}

	if err := model.UpdateOption(option.Key, value); err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}
