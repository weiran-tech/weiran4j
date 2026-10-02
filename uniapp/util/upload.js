// 保留原函数名，页面无需改动；文件统一上传到 FastAPI 本地存储。
export async function uploadOss(file, name) {
	const token = uni.getStorageSync('loginInfo')?.access_token || '';
	const headers = { Authorization: `Bearer ${token}` };

	if (file?.path || file?.tempFilePath) {
		return new Promise((resolve, reject) => {
			uni.uploadFile({
				url: '/api-web/local-files/upload',
				filePath: file.path || file.tempFilePath,
				name: 'file',
				header: headers,
				formData: { original_name: name || file.name || '' },
				success(response) {
					try {
						const body = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
						if (response.statusCode >= 200 && response.statusCode < 300 && body?.code === 200) {
							resolve(body.data.url);
						} else reject(new Error(body?.message || '本地上传失败'));
					} catch (error) {
						reject(error);
					}
				},
				fail: reject
			});
		});
	}

	const form = new FormData();
	form.append('file', file, file?.name || name || 'upload.bin');
	const response = await fetch('/api-web/local-files/upload', { method: 'POST', headers, body: form });
	const body = await response.json();
	if (!response.ok || body?.code !== 200) throw new Error(body?.message || '本地上传失败');
	return body.data.url;
}
