import React, { useEffect, useRef, useState } from 'react';
import { Banner, Button, Col, Divider, Form, Row, Space, Spin, Typography } from '@douyinfe/semi-ui';
import { API, compareObjects, showError, showSuccess, showWarning } from '../../../helpers';
import { useTranslation } from 'react-i18next';

const STORAGE_DEFAULTS = {
  'storage_setting.r2_account_id': '',
  'storage_setting.r2_access_key_id': '',
  'storage_setting.r2_secret_access_key': '',
  'storage_setting.r2_bucket_name': '',
  'storage_setting.r2_custom_domain': '',
  'storage_setting.r2_auto_delete_days': 0,
  'storage_setting.image_r2_enable': false,
  'storage_setting.image_r2_prefix': 'images',
  'storage_setting.image_r2_auto_delete_days': 0,
  'storage_setting.video_r2_enable': false,
  'storage_setting.video_r2_prefix': 'video',
  'storage_setting.playground_forward_enable': true,
};

export default function SettingsStorage(props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [inputs, setInputs] = useState(STORAGE_DEFAULTS);
  const [inputsRow, setInputsRow] = useState(inputs);
  const refForm = useRef();

  function handleFieldChange(fieldName) {
    return (value) => {
      setInputs((prev) => ({ ...prev, [fieldName]: value }));
    };
  }

  async function onTestConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await API.get('/api/storage/test');
      const { success, message, code } = res.data;
      setTestResult({ success, message, code });
    } catch (e) {
      setTestResult({
        success: false,
        message: t('连接测试请求失败，请稍后重试'),
        code: 'request_error',
      });
    } finally {
      setTesting(false);
    }
  }

  function onSubmit() {
    const updateArray = compareObjects(inputs, inputsRow);
    if (!updateArray.length) {
      return showWarning(t('没有检测到需要保存的变更'));
    }

    const requestQueue = updateArray.map((item) =>
      API.put('/api/storage/options', {
        key: item.key,
        value: String(inputs[item.key]),
      }),
    );

    setLoading(true);
    Promise.all(requestQueue)
      .then((res) => {
        if (res.includes(undefined)) {
          return showError(t('保存配置失败'));
        }
        showSuccess(t('保存配置成功'));
        props.refresh();
      })
      .catch(() => {
        showError(t('保存配置失败'));
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    const currentInputs = { ...STORAGE_DEFAULTS };
    for (const key in STORAGE_DEFAULTS) {
      if (Object.prototype.hasOwnProperty.call(props.options, key)) {
        currentInputs[key] = props.options[key];
      }
    }
    setInputs(currentInputs);
    setInputsRow(structuredClone(currentInputs));
    if (refForm.current) {
      refForm.current.setValues(currentInputs);
    }
  }, [props.options]);

  return (
    <Spin spinning={loading}>
      <Form getFormApi={(formAPI) => (refForm.current = formAPI)} style={{ marginBottom: 15 }}>
        <Typography.Title heading={5}>{t('R2 云存储设置')}</Typography.Title>
        <Typography.Text type='tertiary' size='small'>
          {t('配置 Cloudflare R2 连接信息，并按视频类与图片类分别控制转存行为。')}
        </Typography.Text>

        <Divider style={{ marginTop: 10, marginBottom: 10 }} />
        <Typography.Title heading={6}>{t('全局配置')}</Typography.Title>

        <Row gutter={16}>
          <Col xs={24} sm={12} md={8} lg={8} xl={8}>
            <Form.Input
              field='storage_setting.r2_account_id'
              label={t('Cloudflare Account ID')}
              placeholder={t('请输入 Cloudflare Account ID')}
              initValue={inputs['storage_setting.r2_account_id']}
              onChange={handleFieldChange('storage_setting.r2_account_id')}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={8} xl={8}>
            <Form.Input
              field='storage_setting.r2_access_key_id'
              label={t('R2 Access Key ID')}
              placeholder={t('请输入 R2 Access Key ID')}
              initValue={inputs['storage_setting.r2_access_key_id']}
              onChange={handleFieldChange('storage_setting.r2_access_key_id')}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={8} xl={8}>
            <Form.Input
              field='storage_setting.r2_secret_access_key'
              label={t('R2 Secret Access Key')}
              mode='password'
              placeholder={t('请输入 R2 Secret Access Key')}
              initValue={inputs['storage_setting.r2_secret_access_key']}
              onChange={handleFieldChange('storage_setting.r2_secret_access_key')}
            />
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12} md={8} lg={8} xl={8}>
            <Form.Input
              field='storage_setting.r2_bucket_name'
              label={t('Bucket 名称')}
              placeholder={t('请输入 R2 Bucket 名称')}
              initValue={inputs['storage_setting.r2_bucket_name']}
              onChange={handleFieldChange('storage_setting.r2_bucket_name')}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={8} xl={8}>
            <Form.Input
              field='storage_setting.r2_custom_domain'
              label={t('自定义域名')}
              placeholder='https://cloudflare.cdn.smv.buzz'
              initValue={inputs['storage_setting.r2_custom_domain']}
              onChange={handleFieldChange('storage_setting.r2_custom_domain')}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={8} xl={8}>
            <Form.InputNumber
              field='storage_setting.r2_auto_delete_days'
              label={t('视频类自动删除天数')}
              placeholder={t('0 表示永久保留')}
              min={0}
              initValue={inputs['storage_setting.r2_auto_delete_days']}
              onChange={handleFieldChange('storage_setting.r2_auto_delete_days')}
            />
          </Col>
        </Row>
        <Typography.Text type='tertiary' size='small'>
          {t('用于视频类转存目录（含视频及视频模型产生的图片预览文件）的自动清理。')}
        </Typography.Text>

        <Divider style={{ marginTop: 10, marginBottom: 10 }} />
        <Typography.Title heading={6}>{t('平台 R2 转存开关（分类）')}</Typography.Title>

        <div style={{
          border: '1px solid var(--semi-color-border)',
          borderRadius: 8,
          padding: 12,
          marginTop: 10,
          background: 'var(--semi-color-bg-1)',
        }}>
          <Typography.Title heading={6} style={{ marginTop: 0 }}>
            {t('视频类转存')}
          </Typography.Title>
          <Typography.Text type='tertiary' size='small'>
            {t('适用于视频模型与视频类接管转存；操练场转发开关也归类在视频侧。')}
          </Typography.Text>

          <Row gutter={16} style={{ marginTop: 10 }}>
            <Col xs={12} sm={8} md={6} lg={5} xl={4}>
              <Form.Switch
                field='storage_setting.video_r2_enable'
                label={t('视频 R2 转存开关')}
                checkedText='ON'
                uncheckedText='OFF'
                initValue={inputs['storage_setting.video_r2_enable']}
                onChange={handleFieldChange('storage_setting.video_r2_enable')}
              />
            </Col>
            <Col xs={12} sm={8} md={6} lg={5} xl={4}>
              <Form.Switch
                field='storage_setting.playground_forward_enable'
                label={t('操练场转发开关')}
                checkedText='ON'
                uncheckedText='OFF'
                initValue={inputs['storage_setting.playground_forward_enable']}
                onChange={handleFieldChange('storage_setting.playground_forward_enable')}
              />
            </Col>
            <Col xs={24} sm={16} md={12} lg={10} xl={8}>
              <Form.Input
                field='storage_setting.video_r2_prefix'
                label={t('视频转存前缀')}
                placeholder='video'
                initValue={inputs['storage_setting.video_r2_prefix']}
                onChange={handleFieldChange('storage_setting.video_r2_prefix')}
              />
            </Col>
          </Row>
          <Typography.Text type='tertiary' size='small'>
            {t('操练场转发开关说明')}
          </Typography.Text>
        </div>

        <div style={{
          border: '1px solid var(--semi-color-border)',
          borderRadius: 8,
          padding: 12,
          marginTop: 12,
          background: 'var(--semi-color-bg-1)',
        }}>
          <Typography.Title heading={6} style={{ marginTop: 0 }}>
            {t('图片类转存')}
          </Typography.Title>
          <Typography.Text type='tertiary' size='small'>
            {t('适用于图片模型转存，使用独立前缀与独立自动删除策略。')}
          </Typography.Text>

          <Row gutter={16} style={{ marginTop: 10 }}>
            <Col xs={12} sm={8} md={6} lg={5} xl={4}>
              <Form.Switch
                field='storage_setting.image_r2_enable'
                label={t('图片 R2 转存开关')}
                checkedText='ON'
                uncheckedText='OFF'
                initValue={inputs['storage_setting.image_r2_enable']}
                onChange={handleFieldChange('storage_setting.image_r2_enable')}
              />
            </Col>
            <Col xs={24} sm={16} md={10} lg={9} xl={7}>
              <Form.Input
                field='storage_setting.image_r2_prefix'
                label={t('图片转存前缀')}
                placeholder='images'
                initValue={inputs['storage_setting.image_r2_prefix']}
                onChange={handleFieldChange('storage_setting.image_r2_prefix')}
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={8} xl={6}>
              <Form.InputNumber
                field='storage_setting.image_r2_auto_delete_days'
                label={t('图片自动删除天数')}
                placeholder={t('0 表示永久保留')}
                min={0}
                initValue={inputs['storage_setting.image_r2_auto_delete_days']}
                onChange={handleFieldChange('storage_setting.image_r2_auto_delete_days')}
              />
            </Col>
          </Row>
        </div>

        <Divider style={{ marginTop: 10, marginBottom: 10 }} />
        <Space>
          <Button size='default' onClick={onSubmit} loading={loading}>
            {t('保存配置')}
          </Button>
          <Button size='default' theme='light' type='secondary' onClick={onTestConnection} loading={testing}>
            {t('测试 R2 连接')}
          </Button>
        </Space>

        {testResult && (
          <Banner
            style={{ marginTop: 16 }}
            type={testResult.success ? 'success' : 'danger'}
            description={testResult.message}
            closeIcon={null}
          />
        )}
      </Form>
    </Spin>
  );
}
