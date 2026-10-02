//main.js
import {
	createApp,
	ref,
	watch
} from 'vue';
import App from './App.vue';

// ==================== 【新增】是否为电脑端的全局响应式变量 ====================
const isDesktop = ref(false);

function checkIsDesktop() {
	// uni-app 多端兼容：优先使用 uni.getSystemInfoSync()
	if (typeof uni !== 'undefined' && uni.getSystemInfoSync) {
		try {
			const systemInfo = uni.getSystemInfoSync();
			isDesktop.value = systemInfo.windowWidth > 768;
		} catch (e) {
			// fallback 到 window（H5）
			if (typeof window !== 'undefined') {
				isDesktop.value = window.innerWidth > 768;
			} else {
				isDesktop.value = false; // 非 H5 默认手机端
			}
		}
	} else if (typeof window !== 'undefined') {
		// 纯 H5 环境
		isDesktop.value = window.innerWidth > 768;
	} else {
		isDesktop.value = false;
	}
}

// 初始化判断
checkIsDesktop();

// 监听窗口变化（仅在 H5 或支持 resize 的环境）
let resizeHandler = null;
if (typeof window !== 'undefined') {
	resizeHandler = () => {
		checkIsDesktop();
	};
	window.addEventListener('resize', resizeHandler);
}

// ==================== 创建应用 ====================
const app = createApp(App);

// 挂载 isDesktop：提供 .value 的只读访问方式（用于模板和 JS）
Object.defineProperty(app.config.globalProperties, '$isPC', {
	get() {
		return isDesktop.value;
	},
	enumerable: true,
	configurable: true
});

// 同时挂载原始 ref（供组合式 API inject 使用）
app.provide('isDesktop', isDesktop);

// ==================== 原有登录状态管理 ====================
const isLogin = ref(uni.getStorageSync('isLogin') === true);
app.config.globalProperties.isLogin = isLogin;
watch(isLogin, (newVal) => {
	uni.setStorageSync('isLogin', newVal);
});

// ==================== 项目参数配置 ====================
const CONFIG = {
	name: '大赛',
	baseURL: '', // 当前站点同源 Flask API
	gradeApiBaseURL: '', // 成绩查询统一使用当前 Flask API
	// baseURL: '',  // 本地调试：走 vite 代理到 admin.cqtxj.qidianet.com
	// baseURL: 'https://changctcs.jingkezhihui.com',
	// baseURL: 'https://changchunteng.jktest.jingkezhihui.com',
	baseURL2: '/uploads',
	baseURL3: '/uploads/',
	imgURL: '/uploads',
	swiperURL: '/uploads',
};
app.config.globalProperties.config = CONFIG;

// ==================== 工具方法 ====================
const showToast = (title, icon = 'none') => {
	uni.showToast({
		title,
		icon
	});
};

const showModal = (content) => {
	uni.showModal({
		content: String(content || '请求失败，请稍后重试'),
		showCancel: false
	});
};

const getTokenHeader = () => {
	const token = uni.getStorageSync('loginInfo')?.access_token;
	return token ? {
		Authorization: 'Bearer ' + token
	} : {};
};

// ==================== 请求封装 ====================
// 页面与工具里的接口路径沿用旧写法 /api/...，发请求前统一改写成后端的 /api-web/...
export const toWebApi = (url) => url.replace(/^\/api\//, '/api-web/');

const requestPublic = (configObj, resolve, reject) => {
	const {
		name,
		url,
		data = {},
		method = 'GET',
		header = {}
	} = configObj;

	const historicalLookup = Number(data?.year) === 1 && [
		'/api/product/Competitionlist', '/api/product/ViewGrades', '/api/product/view-grades', '/api/competition/certificate'
	].includes(url);
	const fullHeader = {
		'Content-Type': 'application/json',
		version: 1,
		'X-CQTXJ-Database': historicalLookup ? 'cqtxj2026' : 'cqtxj2027',
		...getTokenHeader(),
		...header,
	};

	let requestUrl = url;
	let requestData = data;

	// GET 参数拼接
	if (method === 'GET' && data && Object.keys(data).length > 0) {
		const queryString = Object.entries(data)
			.map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
			.join('&');
		requestUrl = `${url}?${queryString}`;
		requestData = {};
	}

	const requestBaseURL = ['/api/product/ViewGrades', '/api/product/view-grades'].includes(url)
		? CONFIG.gradeApiBaseURL
		: CONFIG.baseURL;
	// 后端（mono4j weiran-cqt）给 uniapp 的接口统一挂在 /api-web/**，页面里仍写原来的 /api/...，在这里统一改写。
	const fullRequestUrl = requestBaseURL + toWebApi(requestUrl);

	uni.request({
		url: fullRequestUrl,
		method,
		data: requestData,
		header: fullHeader,
		withCredentials: false,
		success: (res) => {
			if (name) console.log(name + '的res', res);
			else console.log(url + '的res', res);

			if (res.statusCode < 200 || res.statusCode >= 300) {
				const responseData = res.data && typeof res.data === 'object' ? res.data : {};
				const errorMessage = responseData.message || responseData.msg
					|| `查询接口请求失败（HTTP ${res.statusCode}），请联系管理员`;
				showModal(errorMessage);
				reject({ statusCode: res.statusCode, data: res.data, message: errorMessage });
				return;
			}

			if (res.data) {
				if (res.data.code == 200) {
					app.config.globalProperties.isLogin.value = true;
					resolve(res);
				} else if (res.data.code == 401 || res.data.message === '请求参数缺token') {
					app.config.globalProperties.isLogin.value = false;
					if (!['登录失效,请重新登录', '请求参数缺token', '管理员未登录'].includes(res.data.message)) {
						showModal(res.data.message);
					}
				} else {
					showModal(res.data.message);
				}
			} else {
				showToast('数据异常', 'none');
			}
		},
		fail: (err) => {
			showToast('网络错误，请检查连接', 'none');
			reject(err);
		},
		complete: () => {
			uni.hideLoading();
			uni.setStorageSync('is_click', 1);
			uni.$emit('loadingComplete');
		}
	});
};

// 挂载 HTTP 方法
['GET', 'POST', 'PUT', 'DELETE'].forEach(method => {
	app.config.globalProperties[method] = function(configObj) {
		return new Promise((resolve, reject) => {
			requestPublic({
				...configObj,
				method
			}, resolve, reject);
		});
	};
});

// ==================== 其他全局方法 ====================
app.config.globalProperties.consoleLog = console.log;

app.config.globalProperties.time_to_timenum = (str) => {
	const date = new Date(str.replace(' ', 'T'));
	return date.getTime();
};

app.config.globalProperties.timenum_to_time = (timestamp) => {
	const date = new Date(Number(timestamp));
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');
	const seconds = String(date.getSeconds()).padStart(2, '0');
	return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

app.config.globalProperties.showToast = showToast;
app.config.globalProperties.showModal = showModal;

app.config.globalProperties.copy = (text) => {
	uni.setClipboardData({
		data: String(text),
		success: () => showToast('已复制到剪贴板')
	});
};

app.config.globalProperties.lookImg = (src) => uni.previewImage({
	urls: [src]
});
app.config.globalProperties.lookImgAll = (urls, current = 0) => uni.previewImage({
	urls,
	current
});

app.config.globalProperties.getTabber = (isPC) => {
	console.log('isPC', isPC)
	if (isPC) {
		uni.hideTabBar({ animation: false, fail: () => {} })
	} else {
		uni.showTabBar({ animation: false, fail: () => {} })
	}
};

app.config.globalProperties.goLoginPage = () => {
	uni.reLaunch({
		url: '/pages/login/login'
	});
};

app.config.globalProperties.callTo = (phone) => {
	uni.makePhoneCall({
		phoneNumber: String(phone)
	});
};

app.config.globalProperties.getCode = () => {
	return new Promise((resolve, reject) => {
		uni.login({
			success: (res) => resolve(res.code),
			fail: reject
		});
	});
};

app.config.globalProperties.getUserProfile = () => {
	return new Promise((resolve, reject) => {
		uni.getUserProfile({
			desc: '用于完善用户资料',
			success: resolve,
			fail: (err) => {
				uni.showToast({
					title: '授权失败，请重试',
					icon: 'none'
				});
				reject(err);
			}
		});
	});
};

app.config.globalProperties.noneLoginToLogin = function() {
	const exemptPages = [
		'/pages/info/info',
		'/pages/video/video',
		'/pages/shop/shop',
		'/pages/my/my',
	];

	const pages = getCurrentPages();
	const currentPage = pages[pages.length - 1];
	const currentRoute = '/' + currentPage.route;

	const queryString = Object.keys(currentPage.options)
		.map(key => `${key}=${encodeURIComponent(currentPage.options[key])}`)
		.join('&');

	const fullCurrentPath = currentRoute + (queryString ? '?' + queryString : '');

	if (!exemptPages.includes(currentRoute)) {
		uni.redirectTo({
			url: `/pages/login/login?backUrl=${encodeURIComponent(fullCurrentPath)}`
		});
	}
};

app.config.globalProperties.maskString = (str) => {
	return str && str.length >= 7 ? str.slice(0, 3) + '****' + str.slice(7) : str;
};

app.config.globalProperties.daohang = (latitude, longitude, name) => {
	uni.openLocation({
		latitude: Number(latitude),
		longitude: Number(longitude),
		scale: 18,
		name: name || '目的地'
	});
};

app.config.globalProperties.chooseImg = function() {
	return new Promise((resolve, reject) => {
		uni.chooseImage({
			count: 1,
			sizeType: ['original', 'compressed'],
			sourceType: ['album', 'camera'],
			success: (res) => {
				const tempFilePath = res.tempFilePaths[0];
				uni.showLoading({
					title: '上传中...'
				});
				uni.uploadFile({
					url: CONFIG.baseURL + 'upload/image',
					filePath: tempFilePath,
					name: 'file',
					header: {
						token: uni.getStorageSync('loginInfo')?.access_token || '',
						version: 1,
					},
					success: (uploadRes) => {
						uni.hideLoading();
						let data;
						try {
							data = JSON.parse(uploadRes.data);
						} catch (e) {
							reject(new Error('上传响应格式错误'));
							return;
						}
						if (data.code === 1 && data.data?.url) resolve(data);
						else {
							uni.showToast({
								title: data.msg || '上传失败',
								icon: 'none'
							});
							reject(new Error(data.msg));
						}
					},
					fail: (err) => {
						uni.hideLoading();
						uni.showToast({
							title: '上传失败',
							icon: 'none'
						});
						reject(err);
					}
				});
			},
			fail: reject
		});
	});
};

app.config.globalProperties.uploadFile = function(filePath) {
	return new Promise((resolve, reject) => {
		uni.showLoading({
			title: '上传中...'
		});
		uni.uploadFile({
			url: CONFIG.baseURL + 'Upload/file',
			filePath: filePath,
			name: 'file',
			header: {
				token: uni.getStorageSync('loginInfo')?.access_token || '',
				version: 1,
			},
			success: (res) => {
				uni.hideLoading();
				let data;
				try {
					data = JSON.parse(res.data);
				} catch (e) {
					reject(new Error('上传响应解析失败'));
					return;
				}
				if (data.code === 1 && data.data?.uri) resolve(data);
				else {
					uni.showToast({
						title: data.msg || '上传失败',
						icon: 'none'
					});
					reject(new Error(data.msg));
				}
			},
			fail: (err) => {
				uni.hideLoading();
				uni.showToast({
					title: '网络错误',
					icon: 'none'
				});
				reject(err);
			}
		});
	});
};

app.config.globalProperties.lookXieYi = (text) => {
	uni.navigateTo({
		url: '/pages/login/text?text=' + text
	})
};

app.config.globalProperties.otherHeight = (num) => {
	const systemInfo = uni.getSystemInfoSync();
	return systemInfo.windowHeight - uni.upx2px(num);
};

app.config.globalProperties.getWeek = (index) => {
	const weeks = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
	return weeks[index] || '';
};

const obj2Url = (obj) => {
	let arr = [];
	for (let k in obj) {
		if (obj.hasOwnProperty(k) && obj[k] !== null && obj[k] !== undefined) {
			let val = obj[k];
			if (typeof val === 'object') val = JSON.stringify(val);
			arr.push(`${k}=${encodeURIComponent(val)}`);
		}
	}
	return arr.length ? '?' + arr.join('&') : '';
};

app.config.globalProperties.navigateTo = (url, params = {}) => uni.navigateTo({
	url: url + obj2Url(params)
});
app.config.globalProperties.redirectTo = (url, params = {}) => uni.redirectTo({
	url: url + obj2Url(params)
});
app.config.globalProperties.reLaunch = (url, params = {}) => uni.reLaunch({
	url: url + obj2Url(params)
});
app.config.globalProperties.switchTab = (url) => uni.switchTab({
	url
});
app.config.globalProperties.goBack = () => uni.navigateBack({
	delta: 1
});
app.config.globalProperties.goIndex = () => uni.reLaunch({
	url: '/pages/index/index'
});

// ==================== 应用卸载时清理监听 ====================
app.mixin({
	mounted() {
		if (this.$root === this && resizeHandler) {
			const originalBeforeUnmount = this.$options.beforeUnmount;
			this.$options.beforeUnmount = function() {
				window.removeEventListener('resize', resizeHandler);
				if (originalBeforeUnmount) originalBeforeUnmount.call(this);
			};
		}
	}
});

// ==================== 启动应用 ====================
app.mount('#app');
