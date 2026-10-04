<template>
	<view>
		<topBox pageName='' :myInfo='myInfo'></topBox>
		<view class='pageBox zzz3'>
			<view class='img2Box zzz3' v-if="pagesIndex==0||pagesIndex==1">
				<view class='title e1' v-if="pagesIndex==1">用户注册<view class='ziBox zzz3'>
						<image class='image'
							src='/static/local_assets/113d225012aeb016965617ef.png' />
						<view class='text' v-if="is_school==0">学生</view>
						<view class='text' v-if="is_school==1">学校</view>
					</view>
				</view>
			</view>
			<view class='zcChooseBox' v-if="pagesIndex==0">
				<view :class="$isPC?'e2':''">
					<view class='isChoose e2 pointer' @click="goZc(0)" @mouseenter="chooseClick = 0"
						@mouseleave="chooseClick = -1">
						<image class="image1" src='/static/local_assets/87bf5a8ccc102b630d498c1b.png'
							mode="widthFix" />
						<view class='text1'>学生注册</view>
					</view>
					<view class='isChoose e2 pointer' @click="goZc(1)" @mouseenter="chooseClick = 1"
						@mouseleave="chooseClick = -1">
						<image class="image2" src='/static/local_assets/8c3f67d6e74a170d3196606b.png'
							mode="widthFix" />
						<view class='text1'>学校注册</view>
					</view>
				</view>
			</view>
			<view class='listBox' v-if="pagesIndex==1">
				<view class='inputs_all'>
					<view :class="$isPC?'e1':''" v-if="is_school==0">
						<view class='e1'>
							<view class='leftText'>*<span style="color: #1F1F1F">学生姓名</span></view>
							<view class='long_box zzz2'>
								<input class='input' type='text' v-model='name' placeholder='请输入学生姓名'
									placeholder-style='color:#999999' />
							</view>
						</view>
						<view class='rightText'>注：本信息将导入证件制作系统，请务必填写准确</view>
					</view>
					<view :class="$isPC?'e1':''" v-if="is_school==1">
						<view class='e1'>
							<view class='leftText'>*<span style="color: #1F1F1F">学校名称</span></view>
							<view class='long_box zzz2'>
								<input class='input' type='text' v-model='name' placeholder='请输入学校名称'
									placeholder-style='color:#999999' />
							</view>
						</view>
						<view class='rightText'>注：本信息将导入证件制作系统，请务必填写准确</view>
					</view>
					<view class='e1' v-if="is_school==1">
						<view class='leftText'>*<span style="color: #1F1F1F">联系人</span></view>
						<view class='long_box zzz2'>
							<input class='input' type='text' v-model='contact' placeholder='请输入联系人'
								placeholder-style='color:#999999' />
						</view>
					</view>
					<view class='e1'>
						<view class='leftText'>*<span style="color: #1F1F1F">联系方式</span></view>
						<view class='long_box zzz2'>
							<input class='input' type='number' v-model='phone' placeholder='请输入联系方式'
								placeholder-style='color:#999999' />
						</view>
					</view>
					<view class='e1'>
						<view class='leftText'>*<span style="color: #1F1F1F">密码</span></view>
						<view class='long_box zzz2'>
							<input class='input' :type="isMing1?'text':'password'" v-model='pass' placeholder='请输入密码'
								placeholder-style='color:#999999' />
						</view>
						<image class='kanyubukan pointer'
							src='/static/local_assets/d939602dc8b6d2d08fa8a1e1.png' v-if="isMing1==0"
							@click="isMing1=1" />
						<image class='kanyubukan pointer'
							src='/static/local_assets/fc8bfaadb36b87e9738e7bd7.png'
							v-if="isMing1==1" @click="isMing1=0" />
					</view>
					<view class='e1'>
						<view class='leftText'>*<span style="color: #1F1F1F">确认密码</span></view>
						<view class='long_box zzz2'>
							<input class='input' :type="isMing2?'text':'password'" v-model='qrpass'
								placeholder='请输入确认密码' placeholder-style='color:#999999' />
						</view>
						<image class='kanyubukan pointer'
							src='/static/local_assets/d939602dc8b6d2d08fa8a1e1.png' v-if="isMing2==0"
							@click="isMing2=1" />
						<image class='kanyubukan pointer'
							src='/static/local_assets/fc8bfaadb36b87e9738e7bd7.png'
							v-if="isMing2==1" @click="isMing2=0" />
					</view>
					<view class='e1'>
						<view class='leftText'>*<span style="color: #1F1F1F">验证码</span></view>
						<view class='yzmBox e2'>
							<view class='shirt_box zzz2'>
								<input class='input' type='number' v-model='code' placeholder='请输入验证码'
									placeholder-style='color:#999999' maxlength="6" />
							</view>
							<!-- 修改点：绑定点击事件，动态显示文字和样式 -->
							<view class='button pointer' :class="{ 'button-disable': isSending }" @click="sendCode">
								{{ isSending ? countdown + 's 后重发' : '发送验证码' }}
							</view>
						</view>
					</view>
					<view class='e1' v-if="is_school==0">
						<view class='leftText'>*<span style="color: #1F1F1F">性别</span></view>
						<view class='sexBox e1'>
							<view class='e1 pointer' @click="sex=1">
								<image class='icon'
									src='/static/local_assets/4c13961eb4a95d2e91bf44b8.png'
									v-if='sex==1' />
								<image class='icon'
									src='/static/local_assets/f5781ebba6ba4715e8294f13.png' v-else />
								<view class='text'>男</view>
							</view>
							<view class='e1 pointer' @click="sex=2">
								<image class='icon'
									src='/static/local_assets/4c13961eb4a95d2e91bf44b8.png'
									v-if='sex==2' />
								<image class='icon'
									src='/static/local_assets/f5781ebba6ba4715e8294f13.png' v-else />
								<view class='text'>女</view>
							</view>
						</view>
					</view>
					<view :class="$isPC?'e1':''" v-if="is_school==0">
						<view class='e1'>
							<view class='leftText'>*<span style="color: #1F1F1F">身份类型</span></view>
							<view class='sexBox e1'>
								<view class='e1 pointer' @click="credential_type='身份证号'">{{credential_type==='身份证号'?'●':'○'}} 身份证号</view>
								<view class='e1 pointer' @click="credential_type='其他'">{{credential_type==='其他'?'●':'○'}} 其他</view>
							</view>
						</view>
					</view>
					<view :class="$isPC?'e1':''" v-if="is_school==0">
						<view class='e1'>
							<view class='leftText'>*<span style="color: #1F1F1F">证件号</span></view>
							<view class='long_box zzz2'>
								<input class='input' type='text' v-model='idcard' :placeholder="credential_type==='身份证号'?'请输入18位身份证号':'请输入其他证件号'"
									placeholder-style='color:#999999' />
							</view>
						</view>
						<view class='rightText'>注：本信息将导入证件制作系统，请务必填写准确</view>
					</view>
					<view class='e1'>
						<view class='leftText'>*<span style="color: #1F1F1F">所在省市</span></view>
						<view class='long_box zzz2 pointer'>
							<view class='e2 w100b'>
								<picker @change="bindPickerChange1" :range="saiquList" range-key="name"
									:value="saiquList.findIndex(item => item.name == info_city)">
									<view class="input" style="color: #333" v-if="info_city">{{info_city}}</view>
									<view class="input" style="color: #999" v-else>请选择省市</view>
								</picker>
							</view>
						</view>
					</view>
					<view :class="$isPC?'e1':''" v-if="is_school==0">
						<view class='e1'>
							<view class='leftText'>*<span style="color: #1F1F1F">所在学校</span></view>
							<view class='long_box zzz2'>
								<input class='input' type='text' v-model='school' placeholder='请输入所在学校'
									placeholder-style='color:#999999' />
							</view>
						</view>
						<view class='rightText'>注：本信息将导入证件制作系统，请务必填写准确</view>
					</view>
					<view class='e11' v-if="is_school==1">
						<view class='leftText'>*<span style="color: #1F1F1F">单位地址</span></view>
						<view class='long_box2 zzz2'>
							<textarea class='textarea' type='text' v-model='address' placeholder='请输入单位地址'
								placeholder-style='color:#999999' />
						</view>
					</view>
					<view class='e1' v-if="is_school==1">
						<view class='leftText'><span style="color: #1F1F1F">电子邮箱</span></view>
						<view class='long_box zzz2'>
							<input class='input' type='text' v-model='email' placeholder='请输入电子邮箱'
								placeholder-style='color:#999999' />
						</view>
					</view>
					<view class='e1' v-if="is_school==1">
						<view class='leftText'>*<span style="color: #1F1F1F">统一社会信用代码</span></view>
						<view class='long_box zzz2'>
							<input class='input' type='text' v-model='schoolid' placeholder='请输入统一社会信用代码'
								placeholder-style='color:#999999' />
						</view>
					</view>
					<!-- cqt-file-upload：上传需登录，学校注册时不再上传材料，注册后到「我的 → 学校认证」补交 -->
					<view class='e1' v-if="is_school==1">
						<view class='leftText2' style="color: #999;">注册后请到「我的 → 学校认证」上传事业单位法人证书与参赛知情承诺书</view>
					</view>
				</view>
				<view class='titles e1 w100b'>
					<image class="pointer" src='/static/local_assets/f5781ebba6ba4715e8294f13.png'
						v-if='isXuan==false' @click='isXuan=true' />
					<image class="pointer" src='/static/local_assets/4c13961eb4a95d2e91bf44b8.png'
						v-if='isXuan==true' @click='isXuan=false' />
					<view class="wzzz">点击同意并接受即表示您已阅读了解并同意<span class="pointer" @click="lookXieYi('用户协议')"
							style='color: #000;text-decoration: underline;'>《用户协议》</span></view>
				</view>
				<view class='buttonBox e1'>
					<view class='button1 pointer' @click="queren">确定</view>
					<view class='button2 pointer' @click="quxiao">取消</view>
				</view>
			</view>
			<view class='zcOkBox zzz3' v-if="pagesIndex==2">
				<image src='/static/local_assets/ced498a4b4cbd7e2a0692ab0.png' />
				<text>注册成功！</text>
				<button @click="reLaunch('/pages/login/login')">去登录</button>
			</view>
		</view>
		<bottomBox pageName='' :configData="configData"></bottomBox>
	</view>
</template>

<script>
	import topBox from '@/components/topBox.vue';
	import bottomBox from '@/components/bottomBox.vue';
	import pickerAddress from '../../wangding-pickerAddress/wangding-pickerAddress2.vue'
	import {
		uploadOss
	} from '@/util/upload.js'

	export default {
		components: {
			topBox,
			bottomBox,
			pickerAddress
		},
		data() {
			return {
				configData: {},
				isXuan: false,
				is_school: 0,
				name: '',
				phone: '',
				code: '',
				sex: 1,
				idcard: '',
				credential_type: '身份证号',
				scrool: '',
				info_city: '',
				contact: '',
				address: '',
				email: '',
				schoolid: '',
				cities: '',
				pagesIndex: 0,
				chooseClick: -1,
				myInfo: {},
				isLogin: true,
				link_url: '',
				saiquList: [],
				businessLicenseId: '',
				businessLicenseName: '',
				commitmentLetterId: '',
				businessLicenseUrl: '',
				commitmentLetterUrl: '',
				commitmentLetterName: '',
				// 新增：验证码相关状态
				isSending: false, // 是否正在发送或倒计时中
				countdown: 60, // 倒计时秒数
				timer: null, // 定时器引用
				pass: '',
				qrpass: '',
				isMing1: 0,
				isMing2: 0,
				tupiantype: 0,
			}
		},
		onLoad() {
			console.log('onLoadonLoadonLoadonLoad')
			setTimeout(() => {
				this.getTabber(this.$isPC)
				this.getlinkinfo()
				this.POST({
					name: '个人信息2',
					url: '/api/auth/userinfo',
					data: {}
				}).then((res) => {
					if (res.data.code == 401) {
						this.isLogin = false
					} else {
						console.log('--已登录')
						this.isLogin = true
						this.myInfo = res.data.data
					}
				});

				this.GET({
					name: '赛区',
					url: '/api/competcategory/regions',
					data: {}
				}).then((res) => {
					console.log('赛区res', res)
					this.saiquList = res.data.data
				});
			}, 444)

		},
		onShow() {
			this.GET({
				name: '获取网站配置',
				url: '/api/product/getconfig',
				data: {}
			}).then((res) => {
				this.configData = res.data.data
			});
		},
		onUnload() {
			// 页面卸载时清除定时器，防止内存泄漏
			if (this.timer) {
				clearInterval(this.timer);
				this.timer = null;
			}
		},
		methods: {
			// 生成时间戳随机文件名（和你主页面完全一致）
			getTimestampRandom() {
				const timestamp = new Date().getTime();
				const random = Math.floor(Math.random() * 900) + 100;
				return `${timestamp}${random}`;
			},

			// 营业执照上传（OSS）
			uploadBusinessLicense() {
				uni.chooseImage({
					count: 1,
					sizeType: ['original', 'compressed'],
					sourceType: ['album', 'camera'],
					success: (res) => {
						const tempFile = res.tempFiles[0];
						const timeRandom = this.getTimestampRandom();
						const timename = `school_license/${timeRandom}-${tempFile.name}`;

						uni.showLoading({
							title: '上传中...',
							mask: true
						});

						uploadOss(tempFile, timename).then(ossUrl => {
							uni.hideLoading();
							this.businessLicenseUrl = ossUrl;
							uni.showToast({
								title: '上传成功'
							});
						}).catch(err => {
							uni.hideLoading();
							uni.showToast({
								title: '上传失败',
								icon: 'none'
							});
						});
					}
				});
			},

			// 承诺书图片上传（OSS）
			uploadCommitmentImage() {
				uni.chooseImage({
					count: 1,
					success: (res) => {
						const tempFile = res.tempFiles[0];
						const timeRandom = this.getTimestampRandom();
						const timename = `school_commitment/${timeRandom}-${tempFile.name}`;

						uni.showLoading({
							title: '上传中...',
							mask: true
						});

						uploadOss(tempFile, timename).then(ossUrl => {
							uni.hideLoading();
							this.commitmentLetterUrl = ossUrl;
							this.commitmentLetterName = tempFile.name;
							uni.showToast({
								title: '上传成功'
							});
						}).catch(err => {
							uni.hideLoading();
							uni.showToast({
								title: '上传失败',
								icon: 'none'
							});
						});
					}
				});
			},

			// 承诺书PDF上传（OSS）
			uploadCommitmentPdf() {
				uni.chooseFile({
					count: 1,
					extension: ['pdf'],
					success: (res) => {
						const file = res.tempFiles[0];
						const timeRandom = this.getTimestampRandom();
						const timename = `school_commitment/${timeRandom}-${file.name}`;

						uni.showLoading({
							title: '上传中...',
							mask: true
						});

						uploadOss(file, timename).then(ossUrl => {
							uni.hideLoading();
							this.commitmentLetterUrl = ossUrl;
							this.commitmentLetterName = file.name;
							uni.showToast({
								title: '上传成功'
							});
						}).catch(err => {
							uni.hideLoading();
							uni.showToast({
								title: '上传失败',
								icon: 'none'
							});
						});
					}
				});
			},

			getlinkinfo() {
				this.POST({
					name: '获取下载链接',
					url: '/api/auth/getlinkinfo',
					data: {}
				}).then((res) => {
					this.link_url = res.data.data
				});
			},
			change_area(data) {
				console.log('---data', data)
				this.info_city = data.data.join('-')
				this.cities = data.id[0]
			},
			goZc(e) {
				this.pagesIndex = 1
				this.is_school = e
			},
			bindPickerChange1: function(e) {
				this.cities = this.saiquList[e.detail.value].id
				this.info_city = this.saiquList[e.detail.value].name
			},

			// 新增：发送验证码逻辑
			sendCode() {
				// 1. 如果正在倒计时，直接返回
				if (this.isSending) return;

				// 2. 校验手机号
				const phoneReg = /^1[3-9]\d{9}$/;
				if (!this.phone) {
					this.showToast('请输入联系方式');
					return;
				}
				if (!phoneReg.test(this.phone)) {
					this.showToast('手机号格式不正确');
					return;
				}

				// 3. 调用接口
				this.GET({
					name: '发送验证码',
					url: '/api/auth/sendSms', // 确保后端有此接口
					data: {
						phone: this.phone,
					}
				}).then((res) => {
					// 接口成功回调 (根据实际后端成功码调整，通常是 200 或 0)
					if (res.data.code === 200 || res.data.code === 0) {
						this.showToast('验证码已发送');
						this.startTimer();
					} else {
						this.showToast(res.data.msg || '发送失败');
					}
				}).catch((err) => {
					// 接口失败回调 (如果没有接口，可以先模拟成功以便测试UI)
					console.log('接口未连接或报错，模拟发送成功以便测试UI');
					// --- 测试用开始 (实际开发请删除此块) ---
					// this.showToast('模拟发送成功');
					// this.startTimer();
					// --- 测试用结束 ---
					this.showToast('网络错误或接口未配置');
				});
			},

			// 新增：启动倒计时
			startTimer() {
				this.isSending = true;
				this.countdown = 60;

				this.timer = setInterval(() => {
					this.countdown--;
					if (this.countdown <= 0) {
						clearInterval(this.timer);
						this.timer = null;
						this.isSending = false;
						this.countdown = 60;
					}
				}, 1000);
			},

			queren() {
				if (this.isXuan == false) {
					this.showToast('请阅读并同意《用户协议》')
					return
				}
				if (this.is_school == 1 && !this.schoolid) {
					this.showToast('统一社会信用代码为必填项')
					return
				}
				// 增加验证码校验
				if (!this.code) {
					this.showToast('请输入验证码');
					return;
				}

				if (this.is_school == 0) {
					if (!this.idcard || (this.credential_type === '身份证号' && this.idcard.trim().length !== 18)) {
						this.showToast(this.credential_type === '身份证号' ? '请输入正确的18位身份证号' : '请输入证件号');
						return;
					}
					this.POST({
						name: '学生注册',
						url: '/api/auth/register',
						data: {
							type: 1,
							name: this.name,
							phone: this.phone,
							code: this.code,
							sex: this.sex,
							idcard: this.idcard,
							credential_type: this.credential_type,
							cities: this.cities,
							school: this.school,
							schoolid: this.schoolid,
							password: this.pass,
							password_confirmation: this.qrpass,
						}
					}).then((res) => {
						console.log('学校注册res', res)
						if (res.data.code === 200 || res.data.code === 0) {
							uni.showToast({
								title: '注册成功',
								icon: "success"
							})
							// setTimeout(() => {
							// 	uni.reLaunch({
							// 		url: '/pages/login/login'
							// 	})
							// }, 1000)
							this.POST({
								name: '学生登录',
								url: '/api/auth/autologin',
								data: {
									phone: this.phone,
									name: this.name,
									password: this.pass,
								}
							}).then((res2) => {
								uni.setStorageSync('loginInfo', res2.data.data) //存储
								this.POST({
									name: '个人信息2',
									url: '/api/auth/userinfo',
									data: {}
								}).then((res3) => {
									uni.setStorageSync('isZhuce', 1)
									setTimeout(() => {
										uni.reLaunch({
											url: '/pages/my/my'
										})
									}, 1000)
								});
							});
						} else {
							uni.showToast({
								title: res.data.msg || '注册失败',
								icon: "none"
							})
						}
					});
				}
				if (this.is_school == 1) {
					this.POST({
						name: '学校注册',
						url: '/api/auth/register',
						data: {
							type: 2,
							name: this.name,
							contact: this.contact,
							phone: this.phone,
							code: this.code,
							sex: this.sex,
							idcard: this.idcard,
							cities: this.cities,
							school: this.school,
							schoolid: this.schoolid,
							address: this.address,
							email: this.email,
							zhizhao: this.businessLicenseUrl,
							tupiantype: this.tupiantype,
							chengnuoshu: this.commitmentLetterUrl,
							chengnuoshuname: this.commitmentLetterName,
							password: this.pass,
							password_confirmation: this.qrpass,
						}
					}).then((res) => {
						console.log('学校注册res', res)
						if (res.data.code === 200 || res.data.code === 0) {
							uni.showToast({
								title: '注册成功',
								icon: "success"
							})
							// setTimeout(() => {
							// 	uni.reLaunch({
							// 		url: '/pages/login/login'
							// 	})
							// }, 1000)
							this.POST({
								name: '学生登录',
								url: '/api/auth/autologin',
								data: {
									phone: this.phone,
									name: this.name,
									password: this.pass,
								}
							}).then((res2) => {
								uni.setStorageSync('loginInfo', res2.data.data) //存储
								this.POST({
									name: '个人信息2',
									url: '/api/auth/userinfo',
									data: {}
								}).then((res3) => {
									uni.setStorageSync('isZhuce', 1)
									setTimeout(() => {
										uni.switchTab({
											url: '/pages/my/my'
										})
									}, 1000)
								});
							});
						} else {
							uni.showToast({
								title: res.data.msg || '注册失败',
								icon: "none"
							})
						}
					});
				}
			},
			quxiao() {
				this.pagesIndex = 0
				this.is_school = ''
			},

			downloadTemplate() {
				console.log('this.link_url', this.link_url);
				if (!this.link_url) {
					uni.showToast({
						title: '下载链接未配置',
						icon: 'none'
					});
					return;
				}

				// ✅ 电脑 H5 最稳妥的方式：直接赋值 location.href
				// 浏览器会视为用户发起的导航，不会被拦截
				window.location.href = this.link_url;
			},

			viewFile(url) {
				if (!url) {
					uni.showToast({
						title: '文件地址无效',
						icon: 'none'
					});
					return;
				}
				// 如果是本地临时路径（开发用），直接打开可能无效，建议提示
				if (url.startsWith('http')) {
					window.open(url, '_blank'); // 新窗口打开，防止离开注册页
				} else {
					uni.showToast({
						title: '请上传有效网络链接',
						icon: 'none'
					});
				}
			}
		}
	}
</script>

<style lang="scss" scoped>
	page {
		background: #F5F5F5;
	}

	/*  电脑端样式 */
	@media (min-width: 769px) {

		/* PDF 上传样式 */
		.pdf-upload-box {
			width: 100%;
			min-height: 200rpx;
			border: 2rpx dashed #ddd;
			border-radius: 10rpx;
			padding: 20rpx;
			box-sizing: border-box;
		}

		.shnagcImg {
			width: 8vw;
			height: 8vw;
		}

		.leftText2 {
			font-size: 1vw;
			color: #333;
			text-decoration: underline;
		}

		.pageBox {
			width: 100vw;

			.img2Box {
				position: relative;
				width: 100vw;
				height: 15.16vw;
				background-image: url('/static/local_assets/16edf6178972bdaf37e37020.png');
				background-position: center center;
				background-repeat: no-repeat;
				background-size: cover;
				margin-top: 6.25vw;

				.title {
					width: 62.5vw;
					max-width: 3400rpx;
					font-weight: bold;
					font-size: 2.08vw;
					color: #FFFFFF;
					text-align: left;
					margin-bottom: 5vw;
				}

				.ziBox {
					position: relative;
					width: 3.65vw;
					height: 1.67vw;
					margin-left: 0.36vw;

					.image {
						position: absolute;
						top: 0;
						left: 0;
						width: 100%;
						height: 1.67vw;
					}

					.text {
						position: absolute;
						top: 0;
						left: 0;
						width: 100%;
						height: 1.67vw;
						font-weight: bold;
						font-size: 1.04vw;
						color: #FFFFFF;
						line-height: 1.67vw;
						text-align: center;
					}

				}
			}

			.zcOkBox {
				width: 62.50vw;
				max-width: 3400rpx;
				margin-top: 12vw;
				z-index: 229;
				background-color: #FFFFFF;
				border-radius: 20rpx;
				margin-top: 7.6vw;
				margin-bottom: 6.72vw;
				padding-top: 2.24vw;
				padding-bottom: 9.69vw;

				image {
					width: 10.42vw;
					height: 10.42vw;
				}

				text {
					font-weight: bold;
					font-size: 1.25vw;
					color: #333333;
					margin-top: 1.04vw;
					margin-bottom: 1.93vw;
				}

				button {
					width: 12.29vw;
					height: 3.13vw;
					background: #E62402;
					border-radius: 100rpx;
					font-weight: bold;
					font-size: 1.25vw;
					color: #FFFFFF;
					line-height: 3.13vw;
					text-align: center;
				}
			}

			.zcChooseBox {
				width: 62.50vw;
				max-width: 3400rpx;
				margin-top: -12vw;
				margin-bottom: 5.66vw;
				z-index: 229;

				.isChoose {
					position: relative;
					width: 30.21vw;
					height: 18.02vw;
					background: #FFFFFF;
					border-radius: 24rpx;
					border: 4rpx solid #FFFFFF;
					box-sizing: border-box;
					margin-bottom: 2vw;

					.image1 {
						position: absolute;
						bottom: 0;
						left: 1.25vw;
						width: 11.35vw;
					}

					.image2 {
						position: absolute;
						bottom: 0.99vw;
						left: 0;
						width: 15.99vw;
					}

					.text1 {
						position: absolute;
						top: 7.81vw;
						right: 8.02vw;
						font-weight: bold;
						font-size: 1.25vw;
						color: #333333;
					}
				}

				.isChoose:hover {
					box-shadow: 0px 21 52px 0px #DDDDDD;
					border: 4rpx solid #E62402;
					box-sizing: border-box;
				}

				.qudenglu {
					font-size: 1.3vw;
					color: #E62402;
					text-align: center;
					text-decoration: underline;
				}
			}

			.listBox {
				width: 62.50vw;
				max-width: 3400rpx;
				margin-top: -7vw;
				margin-bottom: 2.66vw;
				z-index: 229;
				background-color: #FFFFFF;
				border-radius: 20rpx;
				padding: 2.6vw 4vw 3.39vw 7.97vw;
				box-sizing: border-box;

				.inputs_all {
					display: flex;
					flex-direction: column;
					gap: 1.56vw;
					margin-bottom: 2.29vw;

					.leftText {
						width: 4vw;
						font-weight: 500;
						font-size: 0.83vw;
						color: #E62402;
						text-align: right;
						margin-right: 1.6vw;
					}

					.rightText {
						font-weight: 500;
						font-size: 0.63vw;
						color: #E8A664;
						margin-left: 1vw;
					}

					.kanyubukan {
						width: 1.2vw;
						height: 1.2vw;
						margin-left: 1vw;
					}

					.long_box {
						width: 21.56vw;
						height: 2.60vw;
						background: #F5F5F5;
						border-radius: 10rpx;
						padding: 0 0.52vw;
						box-sizing: border-box;

						.input {
							width: 16vw;
							font-weight: 500;
							font-size: 0.83vw;
							color: #333;
						}

						.icon {
							width: 0.83vw;
							height: 0.83vw;
						}
					}

					.long_box2 {
						width: 21.56vw;
						height: 4.60vw;
						background: #F5F5F5;
						border-radius: 10rpx;
						padding: 0 0.52vw;
						box-sizing: border-box;

						.textarea {
							width: 20vw;
							height: 4vw;
							font-weight: 500;
							font-size: 0.83vw;
							color: #333;
						}
					}

					.yzmBox {
						width: 21.56vw;
						display: flex;
						justify-content: space-between;
						align-items: center;
					}

					.sexBox {
						margin: 0.78vw 0;

						.icon {
							width: 1vw;
							height: 1vw;
							margin-right: 0.36vw;
						}

						.text {
							font-size: 0.83vw;
							color: #1F1F1F;
							margin-right: 1.41vw;
						}
					}

					.button {
						width: 7.03vw;
						height: 2.60vw;
						background: #E62402;
						border-radius: 10rpx;
						font-size: 0.83vw;
						color: #FFFFFF;
						text-align: center;
						line-height: 2.60vw;
						transition: all 0.3s;

						&.button-disable {
							background: #CCCCCC;
							cursor: not-allowed;
							color: #999999;
						}
					}

					.shirt_box {
						width: 14.01vw;
						height: 2.60vw;
						background: #F5F5F5;
						border-radius: 10rpx;
						padding: 0 0.52vw;
						box-sizing: border-box;

						.input {
							width: 12vw;
							font-weight: 500;
							font-size: 0.83vw;
							color: #333;
						}
					}
				}

				.titles {
					margin-top: 2.24vw;
					margin-left: 5.7vw;

					image {
						width: 1vw;
						height: 1vw;
						margin-right: 0.26vw;
					}

					.wzzz {
						font-weight: 400;
						font-size: 0.63vw;
						color: #999999;
					}
				}

				.buttonBox {
					margin-left: 5vw;
					margin-top: 1.46vw;
					gap: 1.88vw;

					.button1 {
						width: 10.16vw;
						height: 3.02vw;
						background: #E62402;
						border-radius: 14rpx;
						font-weight: 500;
						font-size: 1.04vw;
						color: #FFFFFF;
						text-align: center;
						line-height: 3.02vw;
					}

					.button2 {
						width: 10.16vw;
						height: 3.02vw;
						background: #F5F5F5;
						border-radius: 14rpx;
						font-weight: 500;
						font-size: 1.04vw;
						color: #1F1F1F;
						text-align: center;
						line-height: 3.02vw;
					}
				}
			}
		}
	}

	/*  手机端样式 */
	@media (max-width: 768px) {

		/* PDF 上传样式 */
		.pdf-upload-box {
			padding: 24rpx;
			box-sizing: border-box;
			font-size: 24rpx;
			color: #333;
		}

		.shnagcImg {
			width: 180rpx;
			height: 180rpx;
		}

		.leftText2 {
			font-size: 28rpx;
			color: #333;
			text-decoration: underline;
		}

		.pageBox {
			width: 100vw;

			.img2Box {
				position: relative;
				width: 100vw;
				height: 500rpx;
				background-image: url('/static/local_assets/16edf6178972bdaf37e37020.png');
				background-position: center center;
				background-repeat: no-repeat;
				background-size: cover;
				margin-top: -60rpx;

				.title {
					width: 700rpx;
					font-weight: bold;
					font-size: 46rpx;
					color: #FFFFFF;
					text-align: left;
				}

				.ziBox {
					position: relative;
					width: 73rpx;
					height: 33.4rpx;
					margin-left: 4rpx;

					.image {
						position: absolute;
						top: 0;
						left: 0;
						width: 100%;
						height: 33.4rpx;
					}

					.text {
						position: absolute;
						top: 0;
						left: 0;
						width: 100%;
						height: 33.4rpx;
						font-weight: bold;
						font-size: 24rpx;
						color: #FFFFFF;
						line-height: 33.4rpx;
						text-align: center;
					}

				}
			}

			.zcOkBox {
				width: 700rpx;
				margin-top: 160rpx;
				margin-bottom: 20rpx;
				z-index: 229;
				background-color: #FFFFFF;
				border-radius: 20rpx;
				padding-top: 150rpx;
				padding-bottom: 450rpx;

				image {
					width: 220rpx;
					height: 220rpx;
				}

				text {
					font-weight: bold;
					font-size: 36rpx;
					color: #333333;
					margin-top: 20rpx;
					margin-bottom: 20rpx;
				}

				button {
					width: 420rpx;
					height: 88rpx;
					background: #E62402;
					border-radius: 100rpx;
					font-weight: bold;
					font-size: 32rpx;
					color: #FFFFFF;
					line-height: 88rpx;
					text-align: center;
				}
			}

			.zcChooseBox {
				width: 700rpx;
				margin-top: -60rpx;
				margin-bottom: 620rpx;
				z-index: 229;

				.isChoose {
					width: 100%;
					background: #FFFFFF;
					border-radius: 24rpx;
					padding: 30rpx 30rpx 0vw 30rpx;
					border: 4rpx solid #FFFFFF;
					box-sizing: border-box;
					margin-bottom: 20rpx;

					.image1 {
						width: 140rpx;
						margin-right: 20rpx;

						.img1 {
							width: 120rpx;
						}

						.img2 {
							width: 140rpx;
						}
					}

					.image2 {
						width: 130rpx;
						margin-bottom: 20rpx;
					}

					.text1 {
						font-weight: bold;
						font-size: 44rpx;
						color: #333333;
						margin-bottom: 10rpx;
					}
				}

				.isChoose:hover {
					box-shadow: 0px 21 52px 0px #DDDDDD;
					border: 4rpx solid #E62402;
					box-sizing: border-box;
				}

				.qudenglu {
					font-size: 32rpx;
					color: #E62402;
					text-align: center;
					text-decoration: underline;
				}
			}

			.listBox {
				width: 700rpx;
				margin-top: -200rpx;
				margin-bottom: 20rpx;
				z-index: 229;
				background-color: #FFFFFF;
				border-radius: 10rpx;
				padding: 24rpx;
				box-sizing: border-box;

				.inputs_all {
					display: flex;
					flex-direction: column;
					gap: 24rpx;
					margin-bottom: 24rpx;

					.leftText {
						width: 140rpx;
						font-weight: 500;
						font-size: 28rpx;
						color: #E62402;
						text-align: right;
						margin-right: 24rpx;
					}

					.rightText {
						font-weight: 500;
						font-size: 22rpx;
						color: #E8A664;
					}

					.kanyubukan {
						width: 40rpx;
						height: 40rpx;
						margin-left: 10rpx;
					}

					.long_box {
						width: 400rpx;
						height: 80rpx;
						background: #F5F5F5;
						border-radius: 10rpx;
						padding: 0 10rpx;
						box-sizing: border-box;

						.input {
							width: 370rpx;
							font-weight: 500;
							font-size: 28rpx;
							color: #333;
						}

						.icon {
							width: 30rpx;
							height: 30rpx;
						}
					}

					.long_box2 {
						width: 400rpx;
						height: 180rpx;
						background: #F5F5F5;
						border-radius: 10rpx;
						padding: 0 10rpx;
						box-sizing: border-box;

						.textarea {
							width: 370rpx;
							height: 150rpx;
							font-weight: 500;
							font-size: 28rpx;
							color: #333;
						}
					}

					.yzmBox {
						width: 400rpx;
						display: flex;
						justify-content: space-between;
						align-items: center;
					}

					.sexBox {
						margin: 10rpx 0;

						.icon {
							width: 40rpx;
							height: 40rpx;
							margin-right: 2rpx;
						}

						.text {
							font-size: 24rpx;
							color: #1F1F1F;
							margin-right: 12rpx;
						}
					}

					.button {
						width: 160rpx;
						height: 80rpx;
						background: #E62402;
						border-radius: 10rpx;
						font-size: 28rpx;
						color: #FFFFFF;
						text-align: center;
						line-height: 80rpx;
						transition: all 0.3s;

						&.button-disable {
							background: #CCCCCC;
							cursor: not-allowed;
							color: #999999;
						}
					}

					.shirt_box {
						width: 200rpx;
						height: 80rpx;
						background: #F5F5F5;
						border-radius: 10rpx;
						padding: 0 10rpx;
						box-sizing: border-box;

						.input {
							width: 170rpx;
							font-weight: 500;
							font-size: 28rpx;
							color: #333;
						}
					}
				}

				.titles {
					margin-top: 40rpx;

					image {
						width: 40rpx;
						height: 40rpx;
						margin-right: 10rpx;
					}

					.wzzz {
						font-weight: 400;
						font-size: 24rpx;
						color: #999999;
					}
				}

				.buttonBox {
					margin-left: 120rpx;
					margin-top: 20rpx;
					gap: 20rpx;

					.button1 {
						width: 200rpx;
						height: 80rpx;
						background: #E62402;
						border-radius: 14rpx;
						font-weight: 500;
						font-size: 28rpx;
						color: #FFFFFF;
						text-align: center;
						line-height: 80rpx;
					}

					.button2 {
						width: 200rpx;
						height: 80rpx;
						background: #F5F5F5;
						border-radius: 14rpx;
						font-weight: 500;
						font-size: 28rpx;
						color: #1F1F1F;
						text-align: center;
						line-height: 80rpx;
					}
				}
			}
		}
	}


	/* 添加到 style 中 */
	.tab-box {
		display: flex;
		border: 1px solid #ddd;
		border-radius: 10rpx;
		overflow: hidden;
		width: 300rpx;
	}

	.tab-item {
		flex: 1;
		text-align: center;
		padding: 10rpx 0;
		font-size: 28rpx;
		background-color: #f5f5f5;
		color: #666;
	}

	.tab-active {
		background-color: #E62402 !important;
		color: #fff !important;
	}



	.pdf-placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: #999;
		font-size: 28rpx;
	}

	.pdf-file-item {
		font-size: 28rpx;
		color: #333;
	}
</style>
