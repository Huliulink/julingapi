import React, { useEffect, useState, useRef } from 'react';
import {
  Button,
  Col,
  Form,
  Row,
  Spin,
  Typography,
  Divider,
  Banner,
  Space,
  Tag,
} from '@douyinfe/semi-ui';
import {
  IconCheckCircleStroked,
  IconCloseCircleStroked,
  IconMinusCircleStroked,
} from '@douyinfe/semi-icons';
import {
  compareObjects,
  API,
  showError,
  showSuccess,
  showWarning,
} from '../../../helpers';
import { useTranslation } from 'react-i18next';

// Platform metadata: field key → { label, name }
const PLATFORMS = [
  { key: 'storage_setting.ali_r2_enable',    platform: 'ali',    label: '通义万相' },
  { key: 'storage_setting.kling_r2_enable',  platform: 'kling',  label: '可灵' },
  { key: 'storage_setting.jimeng_r2_enable', platform: 'jimeng', label: '即梦' },
  { key: 'storage_setting.vidu_r2_enable',   platform: 'vidu',   label: 'Vidu' },
  { key: 'storage_setting.doubao_r2_enable', platform: 'doubao', label: '豆包' },
  { key: 'storage_setting.hailuo_r2_enable', platform: 'hailuo', label: '海螺' },
  { key: 'storage_setting.grok_r2_enable',   platform: 'grok',   label: 'Grok' },
];

function PlatformFolderStatus({ platform, result }) {
  const { t } = useTranslation();
  if (!result) return null;

  if (!result.enabled) {
    return (
      <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
        <IconMinusCircleStroked style={{ color: 'var(--semi-color-text-2)', fontSize: 13 }} />
        <Typography.Text type='tertiary' size='small'>{t('未启用，跳过')}</Typography.Text>
      </div>
    );
  }

  if (result.folder_ok) {
    return (
      <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
        <IconCheckCircleStroked style={{ color: 'var(--semi-color-success)', fontSize: 13 }} />
        <Typography.Text type='success' size='small'>
          {t('文件夹已创建')}
          {result.folder_key && (
            <Tag size='small' color='green' style={{ marginLeft: 4 }}>
              {result.folder_key}
            </Tag>
          )}
        </Typography.Text>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 4, display: 'flex', alignItems: 'flex-start', gap: 4 }}>
      <IconCloseCircleStroked style={{ color: 'var(--semi-color-danger)', fontSize: 13, marginTop: 2 }} />
      <Typography.Text type='danger' size='small'>
        {t('文件夹创建失败')}{result.error ? `：${result.error}` : ''}
      </Typography.Text>
    </div>
  );
}

export default function SettingsStorage(props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // null | { success, message, code, platforms }
  const [inputs, setInputs] = useState({
    'storage_setting.r2_account_id': '',
    'storage_setting.r2_access_key_id': '',
    'storage_setting.r2_secret_access_key': '',
    'storage_setting.r2_bucket_name': '',
    'storage_setting.r2_custom_domain': '',
    'storage_setting.r2_auto_delete_days': 0,
    'storage_setting.ali_r2_enable': false,
    'storage_setting.kling_r2_enable': false,
    'storage_setting.jimeng_r2_enable': false,
    'storage_setting.vidu_r2_enable': false,
    'storage_setting.doubao_r2_enable': false,
    'storage_setting.hailuo_r2_enable': false,
    'storage_setting.grok_r2_enable': false,
  });
  const refForm = useRef();
  const [inputsRow, setInputsRow] = useState(inputs);

  function handleFieldChange(fieldName) {
    return (value) => {
      setInputs((inputs) => ({ ...inputs, [fieldName]: value }));
    };
  }

  async function onTestConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await API.get('/api/storage/test');
      const { success, message, code, platforms } = res.data;
      setTestResult({ success, message, code, platforms });
    } catch (e) {
      setTestResult({
        success: false,
        message: t('请求失败，请检查网络或服务器状态'),
        code: 'request_error',
        platforms: null,
      });
    } finally {
      setTesting(false);
    }
  }

  function onSubmit() {
    const updateArray = compareObjects(inputs, inputsRow);
    if (!updateArray.length) return showWarning(t('你似乎并没有修改什么'));
    const requestQueue = updateArray.map((item) => {
      let value = '';
      if (typeof inputs[item.key] === 'boolean') {
        value = String(inputs[item.key]);
      } else {
        value = String(inputs[item.key]);
      }
      return API.put('/api/option/', {
        key: item.key,
        value,
      });
    });
    setLoading(true);
    Promise.all(requestQueue)
      .then((res) => {
        if (res.includes(undefined))
          return showError(t('部分保存失败，请重试'));
        showSuccess(t('保存成功'));
        props.refresh();
      })
      .catch(() => {
        showError(t('保存失败，请重试'));
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    const currentInputs = {};
    for (let key in props.options) {
      if (Object.keys(inputs).includes(key)) {
        currentInputs[key] = props.options[key];
      }
    }
    setInputs(currentInputs);
    setInputsRow(structuredClone(currentInputs));
    if (refForm.current) {
      refForm.current.setValues(currentInputs);
    }
  }, [props.options]);

  const platformResults = testResult?.platforms || null;

  return (
    <Spin spinning={loading}>
      <Form
        getFormApi={(formAPI) => (refForm.current = formAPI)}
        style={{ marginBottom: 15 }}
      >
        <Typography.Title heading={5}>
          {t('R2 云存储设置')}
        </Typography.Title>
        <Typography.Text type='tertiary' size='small'>
          {t('R2 云存储设置说明')}
        </Typography.Text>

        <Divider style={{ marginTop: 10, marginBottom: 10 }} />

        <Typography.Title heading={6}>
          {t('全局配置')}
        </Typography.Title>

        <Row gutter={16}>
          <Col xs={24} sm={12} md={8} lg={8} xl={8}>
            <Form.Input
              field='storage_setting.r2_account_id'
              label='Account ID'
              placeholder={t('输入 Cloudflare Account ID')}
              initValue={inputs['storage_setting.r2_account_id']}
              onChange={handleFieldChange('storage_setting.r2_account_id')}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={8} xl={8}>
            <Form.Input
              field='storage_setting.r2_access_key_id'
              label='Access Key ID'
              placeholder={t('输入 R2 Access Key ID')}
              initValue={inputs['storage_setting.r2_access_key_id']}
              onChange={handleFieldChange('storage_setting.r2_access_key_id')}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={8} xl={8}>
            <Form.Input
              field='storage_setting.r2_secret_access_key'
              label='Secret Access Key'
              mode='password'
              placeholder={t('输入 R2 Secret Access Key')}
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
              placeholder={t('输入 R2 Bucket 名称')}
              initValue={inputs['storage_setting.r2_bucket_name']}
              onChange={handleFieldChange('storage_setting.r2_bucket_name')}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={8} xl={8}>
            <Form.Input
              field='storage_setting.r2_custom_domain'
              label={t('自定义域名')}
              placeholder='https://video.example.com'
              initValue={inputs['storage_setting.r2_custom_domain']}
              onChange={handleFieldChange('storage_setting.r2_custom_domain')}
            />
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12} md={8} lg={8} xl={8}>
            <Form.InputNumber
              field='storage_setting.r2_auto_delete_days'
              label={t('自动删除天数')}
              placeholder={t('0 表示永久保存')}
              min={0}
              initValue={inputs['storage_setting.r2_auto_delete_days']}
              onChange={handleFieldChange('storage_setting.r2_auto_delete_days')}
            />
          </Col>
        </Row>

        <Divider style={{ marginTop: 10, marginBottom: 10 }} />

        <Typography.Title heading={6}>
          {t('平台 R2 转存开关')}
        </Typography.Title>
        <Typography.Text type='tertiary' size='small'>
          {t('平台 R2 转存开关说明')}
        </Typography.Text>

        <Row gutter={16} style={{ marginTop: 10 }}>
          {PLATFORMS.map(({ key, platform, label }) => (
            <Col key={key} xs={12} sm={8} md={6} lg={4} xl={3}>
              <Form.Switch
                field={key}
                label={label}
                checkedText='|'
                uncheckedText='〇'
                initValue={inputs[key]}
                onChange={handleFieldChange(key)}
              />
              {platformResults && (
                <PlatformFolderStatus
                  platform={platform}
                  result={platformResults[platform]}
                />
              )}
            </Col>
          ))}
        </Row>

        <Divider style={{ marginTop: 10, marginBottom: 10 }} />

        <Space>
          <Button size='default' onClick={onSubmit} loading={loading}>
            {t('保存存储设置')}
          </Button>
          <Button
            size='default'
            theme='light'
            type='secondary'
            onClick={onTestConnection}
            loading={testing}
          >
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
