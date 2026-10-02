<template>
	<view>
		<topBox pageName='首页' :myInfo='myInfo'></topBox>
		<view class='pageBox'>
			<image class='imageBig'
				src='/static/local_assets/0cb88cefec0a187c479f34d4.png'
				mode="aspectFill" />

			<!-- 修改点 1: 添加动态类名绑定 -->
			<!-- <view class='box1 zzz3' :class="{ 'animate-up': isBox1Visible }">
				<view class='boxs1 e2'>
					<view v-for="(item, index) in tabs" :key="index" class='tab_box zzz3 pointer'
						@mouseover="tabHoverStates[index] = true" @mouseleave="tabHoverStates[index] = false"
						@click="goPage(item)">
						<image
							:src="tabHoverStates[index] ? `/static/local_assets/true${index + 1}.png` : `/static/local_assets/false${index + 1}.png`" />
						<text>{{ item.text }}</text>
					</view>
				</view>
			</view> -->

			<view class='box2 zzz3 scroll-animate' :class="{ 'animate-in': isBox2Visible }">
				<view class='nameBox zzz3 pointer'>
					<view class='name1'>
						大赛介绍
					</view>
					<view class='name2'>Competition Introduction</view>
				</view>
				<view :class="$isPC?'boxs2 e22':'boxs2'">
					<image class='tu' :src="configData.shouyeimage" mode="aspectFill" style="object-fit: cover" />
					<view class='wen'>
						{{configData.dasaijieshao}}
					</view>
				</view>
			</view>

			<view class='box3 zzz3 scroll-animate' :class="{ 'animate-in': isBox3Visible }">
				<view class='nameBox zzz3 pointer'>
					<view class='name1'>大赛动态</view>
					<view class='name2'>Competition News</view>
				</view>
				<view class='boxs3'>
					<view :class="$isPC ? 'e2 e3' : ''">
						<competitionNewsItem v-for="(item, index) in list1.slice(0, 3)" :key="index" :item="item"
							@click="golook1(index)" />
					</view>
				</view>
				<view class='other-button zzz3 pointer' @click="goMore()">
					<view class='e1'>
						<text>查看更多</text>
						<image src='/static/local_assets/1bee64b18103d2c0fc51a024.png' />
					</view>
				</view>
			</view>

			<!-- 学术评审团区域 -->
			<view class='box4 zzz3 scroll-animate' :class="{ 'animate-in': isBox4Visible }" v-if="isShowPingshenflag">
				<view class='nameBox zzz3 pointer'>
					<view class='name1'>学术评审团</view>
					<view class='name2'>Academic Review Panel</view>
				</view>
				<view class='boxs4' :class="$isPC ? 'e2' : ''">
					<!-- PC端：箭头在左右两侧 -->
					<template v-if="$isPC">
						<image class='jiantou pointer'
							:src="swiperCurrent === 0 ? '/static/local_assets/67242b21424707d326ac18d9.png' : '/static/local_assets/f56f520d7fd2c169fe189fa7.png'"
							mode="widthFix" @click="prevSwiper" />
					</template>
					<swiper class="lunbotu-swiper" :indicator-dots="false" :autoplay="false" :interval="3000"
						:duration="300" :display-multiple-items="1" :space-between="10" @change="onSwiperChange"
						:current="swiperCurrent">
						<swiper-item v-for="(group, gIndex) in list2" :key="gIndex">
							<view class="e1 swiper-page">
								<view v-for="(person, pIndex) in group" :key="pIndex" class="renBox pointer"
									@mouseover="hoverStates[gIndex][pIndex] = true"
									@mouseleave="hoverStates[gIndex][pIndex] = false"
									@click="navigateTo('/pages/index/renDetails?id='+person.id)">
									<image class="paraImage" :src="person.image" mode="aspectFill" />
									<image class="nameImg"
										:src="hoverStates[gIndex][pIndex] ? '/static/local_assets/a6bcaeeb519bf158c6d93e3a.png' : '/static/local_assets/9bd254e22dc869978a8588ab.png'" />
									<view class="nameText">{{ person.title }}</view>
								</view>
							</view>
						</swiper-item>
					</swiper>
					<!-- PC端：箭头在左右两侧 -->
					<template v-if="$isPC">
						<image class='jiantou pointer'
							:src="swiperCurrent === list2.length - 1 ? '/static/local_assets/3904ed8ad3e3cb9d61e252f8.png' : '/static/local_assets/2b76c99935f1515c78475fd1.png'"
							mode="widthFix" @click="nextSwiper" />
					</template>
					<!-- 移动端：箭头在下方 -->
					<view v-else class="jiantou-row">
						<image class='jiantou pointer'
							:src="swiperCurrent === 0 ? '/static/local_assets/67242b21424707d326ac18d9.png' : '/static/local_assets/f56f520d7fd2c169fe189fa7.png'"
							mode="widthFix" @click="prevSwiper" />
						<image class='jiantou pointer'
							:src="swiperCurrent === list2.length - 1 ? '/static/local_assets/3904ed8ad3e3cb9d61e252f8.png' : '/static/local_assets/2b76c99935f1515c78475fd1.png'"
							mode="widthFix" @click="nextSwiper" />
					</view>
				</view>
			</view>
		</view>
		<bottomBox pageName="首页" :configData="configData"></bottomBox>
	</view>
</template>

<script>
	import topBox from '@/components/topBox.vue';
	import bottomBox from '@/components/bottomBox.vue';
	import competitionNewsItem from '@/components/competitionNewsItem.vue';
	import setBox from '@/components/setBox.vue';

	export default {
		components: {
			topBox,
			bottomBox,
			competitionNewsItem,
			setBox
		},
		data() {
			return {
				list1: [{
					image: '/static/local_assets/placeholder.svg',
					name: '“戏润新苗”慈溪市第二届青少年戏曲大赛（决赛）暨小金桂选拔慈溪赛区暨小金桂选拔慈溪赛区',
					time: '2025-11-06'
				}, {
					image: '/static/local_assets/placeholder.svg',
					name: '梨园新苗戏曲大赛：传承与发扬传统艺术',
					time: '2025-11-06'
				}, {
					image: '/static/local_assets/placeholder.svg',
					name: '梨园新苗戏曲大赛：传承与发扬传统艺术',
					time: '2025-11-06'
				}, ],
				list2: [],
				tabHoverStates: [false, false, false, false, false], // 对应 5 个 tab
				tabs: [{
					text: '报名中心',
					url: '',
					isTab: false
				}, {
					text: '参赛方式',
					url: '',
					isTab: false
				}, {
					text: '参赛指导',
					url: '/pages/index/guidance',
					isTab: false
				}, {
					text: '成绩查询',
					url: '/pages/index/grade',
					isTab: true
				}, {
					text: '佳作展示',
					url: '/pages/index/appreciate',
					isTab: false
				}],
				lookIndex1: null,
				lookIndex2: 0,
				selected: [],
				showCount: 1,
				swiperCurrent: 0,
				hoverStates: [],

				myInfo: {},
				isLogin: true,

				// 新增数据
				isBox1Visible: false, // 控制 box1 是否显示动画
				isBox2Visible: false, // 控制 box2（大赛介绍）是否显示动画
				isBox3Visible: false, // 控制 box3（大赛动态）是否显示动画
				isBox4Visible: false, // 控制 box4（学术评审团）是否显示动画
				hasAnimated: false, // 标记是否已经执行过动画，防止重复

				isShowPingshenflag: false,

				configData: {}
			}
		},
		onLoad() {
			this.selected = this.list2.map(() => 0);
			this.hoverStates = this.list2.map(group =>
				group.map(() => false)
			);
			this.get_index()
			this.get_index3()
			console.log('this.config', this.config)

			// 初始化滚动监听
			this.$nextTick(() => {
				this.initScrollObserver();
			});


			this.GET({
				name: '学术评审开关',
				url: '/api/product/Pingshenflag',
				data: {}
			}).then((res) => {
				if (res.data.data.flag == 1) {
					this.isShowPingshenflag = true
				} else {
					this.isShowPingshenflag = false
				}
			});
		},
		onShow() {
			this.getTabber(this.$isPC)

			// 页面显示时检查元素可见性（处理从其他页面返回的情况）
			this.$nextTick(() => {
				this.checkElementVisibility(0);
			});

			this.GET({
				name: '获取网站配置',
				url: '/api/product/getconfig',
				data: {}
			}).then((res) => {
				this.configData = res.data.data
			});

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

			// 如果页面重新显示且尚未动画，再次检查位置（防止从其他页回来时已在可视区但未触发）
			if (!this.hasAnimated) {
				this.$nextTick(() => {
					this.checkElementVisibility(uni.getStorageSync('scrollTop') || 0);
				});
			}
		},
		// 可选：记录滚动位置，以便 onShow 时参考
		onPageScroll(e) {
			uni.setStorageSync('scrollTop', e.scrollTop);
			// 实时检查各板块是否进入视口
			this.checkElementVisibility(e.scrollTop);
		},
		methods: {
			get_index3() {
				this.GET({
					name: '大赛动态',
					url: '/api/product/index?category=2',
					data: {}
				}).then((res) => {
					this.list1 = res.data.data.data || [];
				});
			},
			// 初始化滚动观察逻辑
			initScrollObserver() {
				// 由于 onPageScroll 是生命周期，直接在 onPageScroll 中处理即可
				// 这里主要做首次加载时的检查
				this.checkElementVisibility(0);
			},

			// 检查元素是否在可视区域
			checkElementVisibility(scrollTop) {
				const query = uni.createSelectorQuery().in(this);

				// 检查 box2（大赛介绍）
				query.select('.box2').boundingClientRect((data) => {
					if (!data) return;
					uni.getSystemInfo({
						success: (res) => {
							const windowHeight = res.windowHeight;
							if (data.top < windowHeight * 0.85 && !this.isBox2Visible) {
								this.isBox2Visible = true;
							}
						}
					});
				}).exec();

				// 检查 box3（大赛动态）
				query.select('.box3').boundingClientRect((data) => {
					if (!data) return;
					uni.getSystemInfo({
						success: (res) => {
							const windowHeight = res.windowHeight;
							if (data.top < windowHeight * 0.85 && !this.isBox3Visible) {
								this.isBox3Visible = true;
							}
						}
					});
				}).exec();

				// 检查 box4（学术评审团）
				query.select('.box4').boundingClientRect((data) => {
					if (!data) return;
					uni.getSystemInfo({
						success: (res) => {
							const windowHeight = res.windowHeight;
							if (data.top < windowHeight * 0.85 && !this.isBox4Visible) {
								this.isBox4Visible = true;
							}
						}
					});
				}).exec();
			},

			get_index() {
				this.GET({
					name: '首页学术评审',
					url: '/api/product/index?category=1',
					data: {}
				}).then((res) => {
					const rawData = res.data.data.data || []; // 确保是数组

					let groupSize = 5; // 默认 PC 端每组 5 人
					if (!this.$isPC) {
						groupSize = 3; // 手机端每组 3 人
					}

					// 将一维数组分组为二维数组
					const groupedData = [];
					for (let i = 0; i < rawData.length; i += groupSize) {
						groupedData.push(rawData.slice(i, i + groupSize));
					}

					// 更新 list2
					this.list2 = groupedData;

					// 同步更新 selected 和 hoverStates（用于高亮和交互状态）
					this.selected = this.list2.map(() => 0);
					this.hoverStates = this.list2.map(group =>
						group.map(() => false)
					);

					console.log('this.list2', this.list2)
				});
			},
			// 在 index.vue 的 methods 中
			golook1(index) {
				const item = this.list1[index];

				if (!item || !item.id) {
					uni.showToast({
						title: '数据异常',
						icon: 'none'
					});
					return;
				}

				// 1. 准备数据
				const jumpData = {
					page_type: 'details',
					in_type: 'index',
					id: item.id,
					timestamp: Date.now() // 添加时间戳，确保每次都是新数据
				};

				// 2. 同步写入缓存
				uni.setStorageSync('dynamic_jump_params', jumpData);

				console.log('已写入缓存，准备跳转:', jumpData); // 调试用

				// 3. 执行跳转 (switchTab 不会触发 onLoad，但会触发 onShow)
				uni.switchTab({
					url: '/pages/index/dynamic'
				});
			},
			golook2(groupIndex, personIndex) {
				// 更新对应组的选中索引
				this.$set(this.selected, groupIndex, personIndex);
			},
			onSwiperChange(e) {
				this.swiperCurrent = e.detail.current;
			},
			prevSwiper() {
				if (this.swiperCurrent > 0) {
					this.swiperCurrent--;
				}
			},
			nextSwiper() {
				if (this.swiperCurrent < this.list2.length - 1) {
					this.swiperCurrent++;
				}
			},
			goPage(item) {
				if (item.isTab == true) {
					uni.switchTab({
						url: item.url
					})
				} else {
					uni.navigateTo({
						url: item.url
					})
				}
			},
			goMore() {
				uni.reLaunch({
					url: '/pages/index/dynamic'
				})
			}
		}
	}
</script>

<style lang="scss" scoped>
	/* 定义动画关键帧：从下方淡入并上浮 */
	@keyframes slideUpFade {
		0% {
			opacity: 0;
			transform: translateY(60px);
			/* 初始位置向下偏移 60px */
		}

		100% {
			opacity: 1;
			transform: translateY(0);
			/* 最终位置归位 */
		}
	}

	/* 基础样式：确保过渡平滑（可选，主要靠 animation） */
	.box1 {
		/* 如果需要初始隐藏，可以在这里设置，但通常让 DOM 渲染出来由 animation 控制更好 */
		/* opacity: 0;  <-- 不建议直接设 0，否则无 JS 时不可见 */
	}

	/* 激活状态：应用动画 */
	.box1.animate-up {
		/* cubic-bezier(0.175, 0.885, 0.32, 1.2) 产生轻微回弹效果 */
		animation: slideUpFade 1.8s cubic-bezier(0.175, 0.885, 0.32, 1.2) forwards;
	}

	/*  电脑端样式 */
	@media (min-width: 769px) {
		.pageBox {
			box-sizing: border-box;
			width: 100vw;

			.imageBig {
				width: 100vw;
				height: 100vh;
			}

			.box1 {
				width: 100%;
				padding-top: 3.65vw;
				padding-bottom: 2.66vw;
				background: #FFFFFF;

				.boxs1 {
					width: 56.56vw;
					max-width: 3000rpx;

					.tab_box {
						image {
							width: 5.21vw;
							height: 5.21vw;
							margin-bottom: 1.72vw;
						}

						text {
							font-size: 1.46vw;
							color: #333333;
						}
					}
				}
			}

			// 滚动进入动画样式（PC端）
			@keyframes slideUpFadePC {
				0% {
					opacity: 0;
					transform: translateY(50px);
				}

				100% {
					opacity: 1;
					transform: translateY(0);
				}
			}

			.scroll-animate {
				opacity: 1;
			}

			.scroll-animate.animate-in {
				animation: slideUpFadePC 0.8s ease forwards;
			}

			.box2 {
				width: 100%;
				margin-top: -1vw;
				padding-top: 2vw;
				padding-bottom: 2.14vw;
				// background-image: url('/static/local_assets/6fda29d0795c352be2a75f03.png');
				// background-position: center center;
				// background-repeat: no-repeat;
				// background-size: cover;
				background-color: #f1f1f1;

				.boxs2 {
					width: 61.51vw;
					max-width: 3300rpx;
					margin-top: 1vw;

					.tu {
						width: 38.23vw;
						height: 26.09vw;
						transition: transform 0.3s ease;
						cursor: pointer;
					}

					.tu:hover {
						transform: scale(1.05);
					}

					.wen {
						width: 21.25vw;
						font-size: 1.04vw;
						color: #1F1F1F;
						letter-spacing: 0;
						line-height: 1.8;
						text-align: justify;
						text-align-last: left;
						text-indent: 2em;
						font-family: 'Noto Sans SC', 'Source Han Sans SC', '思源黑体', 'Microsoft YaHei', 'PingFang SC', sans-serif;
					}
				}
			}

			.box3 {
				width: 100%;
				padding-top: 0vw;
				padding-bottom: 1.25vw;
				background: #FFFFFF;

				.boxs3 {
					width: 60.11vw;
					max-width: 3200rpx;

					.dongtaiBox {
						width: 19.27vw;
						margin-bottom: 2.45vw;
						overflow: hidden;
						cursor: pointer;

						.image1 {
							width: 100%;
							height: 14.58vw;
							margin-bottom: 1.56vw;
							transition: transform 0.3s ease;
						}

						&:hover .image1 {
							transform: scale(1.05);
						}

						.text1 {
							width: 100%;
							font-size: 1.04vw;
							text-align: left;
							margin-bottom: 0.52vw;
							height: 3.2vw;
						}

						.text2 {
							width: 100%;
							font-size: 0.73vw;
							text-align: left;
							margin-bottom: 1.04vw;
						}

						.line {
							width: 100%;
							height: 1px;
							margin-bottom: 1.04vw;
						}

						.button-first {
							border: 2rpx solid #E62402;
						}

						.button-normal {
							border: 2rpx solid #999999;
						}

						.button {
							width: 3.39vw;
							height: 1.46vw;
							background: #FFFFFF;

							text {
								font-size: 0.73vw;
								color: #E62402;
								margin-right: 0.21vw;
							}

							image {
								width: 0.52vw;
								height: 0.52vw;
							}
						}
					}
				}

				.other-button {
					width: 11.04vw;
					height: 2.86vw;
					border: 2rpx solid #989898;
					transition: all 0.3s ease;
					cursor: pointer;

					text {
						font-weight: bold;
						font-size: 0.83vw;
						color: #989898;
						margin-right: 0.73vw;
						transition: color 0.3s ease;
					}

					image {
						width: 0.52vw;
						height: 0.52vw;
						transition: filter 0.3s ease;
					}
				}

				.other-button:hover {
					border-color: #E62402;

					text {
						color: #E62402;
					}

					image {
						filter: brightness(0) saturate(100%) invert(31%) sepia(94%) saturate(6016%) hue-rotate(358deg) brightness(97%) contrast(88%);
					}
				}
			}

			.box4 {
				width: 100%;
				padding-top: 0.06vw;
				padding-bottom: 5.10vw;
				// background-image: url('/static/local_assets/4ff4df79b5502bd57ec4a6b4.png');
				// background-position: center center;
				// background-repeat: no-repeat;
				// background-size: cover;
				background-color: #f1f1f1;

				.boxs4 {
					width: 75vw;
					max-width: 4000rpx;
					gap: 3.23vw;

					.jiantou {
						width: 2.08vw;
					}

					.lunbotu-swiper {
						width: calc(100% - 4.16vw); // 减去左右箭头宽度
						height: 18.70vw;

						.swiper-page {
							width: 100%;
							height: 100%;
							display: flex;
							justify-content: center;
							align-items: flex-start;
							gap: 0.63vw;
						}
					}


					.renBox {
						position: relative;
						width: 12.40vw;
						height: 18.70vw;
						flex-shrink: 0;
						/* 防止被压缩 */
						overflow: hidden;
						cursor: pointer;

						.paraImage {
							width: 100%;
							height: 100%;
							-webkit-clip-path: polygon(0% 0%, 92% 0%, 100% 100%, 8% 100%);
							clip-path: polygon(0% 0%, 92% 0%, 100% 100%, 8% 100%);
							object-fit: cover;
							transition: transform 0.3s ease;
						}

						&:hover .paraImage {
							transform: scale(1.05);
						}

						.image {
							width: 100%;
							height: 100%;
							object-fit: cover;
						}

						.nameImg {
							position: absolute;
							bottom: -0;
							right: -0;
							width: 11.46vw;
							height: 1.88vw;
						}

						.nameText {
							position: absolute;
							bottom: 0;
							right: 0;
							width: 11.46vw;
							height: 1.88vw;
							text-align: center;
							font-size: 0.83vw;
							color: #FFFFFF;
							line-height: 1.88vw;
						}
					}
				}
			}

			.nameBox {
				position: relative;
				width: 19.35vw;
				height: 8.02vw;
				background-image: url('/static/local_assets/home-background.png');
				background-position: center center;
				background-repeat: no-repeat;
				background-size: cover;

				.name1 {
					position: absolute;
					top: 1.35vw;
					font-weight: 900;
					font-size: 2.08vw;
					color: #1F1F1F;
					letter-spacing: 0.3vw;
				}

				.name2 {
					position: absolute;
					bottom: 2.24vw;
					font-weight: 400;
					font-size: 0.83vw;
					color: #000000;
				}
			}
		}
	}

	/*  手机端样式 */
	@media (max-width: 768px) {
		.pageBox {
			padding-top: 120rpx;
			box-sizing: border-box;
			width: 100%;

			.imageBig {
				width: 100%;
			}

			.box1 {
				width: 100%;
				padding: 24rpx;
				box-sizing: border-box;
				background: #FFFFFF;

				.boxs1 {
					width: 100%;

					.tab_box {
						image {
							width: 80rpx;
							height: 80rpx;
							margin-bottom: 10rpx;
						}

						text {
							font-size: 26rpx;
							color: #333333;
						}
					}
				}
			}

			// 滚动进入动画样式（移动端）
			@keyframes slideUpFadeMobile {
				0% {
					opacity: 0;
					transform: translateY(30px);
				}

				100% {
					opacity: 1;
					transform: translateY(0);
				}
			}

			.scroll-animate {
				opacity: 1;
			}

			.scroll-animate.animate-in {
				animation: slideUpFadeMobile 0.6s ease forwards;
			}

			.box2 {
				width: 100%;
				padding: 0 24rpx 40rpx 24rpx;
				box-sizing: border-box;
				background-color: #f1f1f1;
				// background-image: url('/static/local_assets/6fda29d0795c352be2a75f03.png');
				// background-position: center center;
				// background-repeat: no-repeat;
				// background-size: cover;

				.boxs2 {
					width: 100%;

					.tu {
						width: 100%;
						transition: transform 0.3s ease;
					}

					.tu:active {
						transform: scale(1.05);
					}

					.wen {
						margin-top: 20rpx;
						width: 100%;
						font-size: 28rpx;
						color: #1F1F1F;
						text-align: justify;
						text-align-last: left;
						text-indent: 2em;
						line-height: 1.8;
						font-family: 'Noto Sans SC', 'Source Han Sans SC', '思源黑体', 'Microsoft YaHei', 'PingFang SC', sans-serif;
					}
				}
			}

			.box3 {
				width: 100%;
				padding: 0 24rpx 40rpx 24rpx;
				box-sizing: border-box;
				background: #FFFFFF;

				.boxs3 {
					width: 100%;

					.dongtaiBox {
						width: 100%;
						margin-bottom: 30rpx;
						overflow: hidden;

						.image1 {
							width: 100%;
							margin-bottom: 10rpx;
							transition: transform 0.3s ease;
						}

						&:active .image1 {
							transform: scale(1.05);
						}

						.text1 {
							width: 100%;
							font-size: 28rpx;
							text-align: left;
							margin-bottom: 12rpx;
						}

						.text2 {
							width: 100%;
							font-size: 24rpx;
							text-align: left;
							margin-bottom: 20rpx;
						}

						.line {
							display: none;
						}

						.button-first {
							display: none;
						}

						.button-normal {
							display: none;
						}

						.button {
							display: none;
						}
					}
				}

				.other-button {
					width: 270rpx;
					height: 88rpx;
					border: 2rpx solid #989898;
					transition: all 0.3s ease;

					text {
						font-weight: bold;
						font-size: 32rpx;
						color: #989898;
						margin-right: 20rpx;
						transition: color 0.3s ease;
					}

					image {
						width: 30rpx;
						height: 30rpx;
						transition: filter 0.3s ease;
					}
				}

				.other-button:active {
					border-color: #E62402;

					text {
						color: #E62402;
					}

					image {
						filter: brightness(0) saturate(100%) invert(31%) sepia(94%) saturate(6016%) hue-rotate(358deg) brightness(97%) contrast(88%);
					}
				}
			}

			.box4 {
				width: 100%;
				padding: 0 24rpx 24rpx 24rpx;
				box-sizing: border-box;
				// background-image: url('/static/local_assets/4ff4df79b5502bd57ec4a6b4.png');
				// background-position: center center;
				// background-repeat: no-repeat;
				// background-size: cover;
				background-color: #f1f1f1;

				.boxs4 {
					width: 100%;
					display: flex;
					flex-direction: column;
					align-items: center;

					.lunbotu-swiper {
						width: 100%;
						height: 280rpx;

						.swiper-page {
							width: 100%;
							height: 100%;
							display: flex;
							justify-content: center;
							align-items: flex-start;
							gap: 10rpx;
						}
					}

					.jiantou-row {
						display: flex;
						justify-content: center;
						align-items: center;
						gap: 40rpx;
						margin-top: 20rpx;

						.jiantou {
							width: 40rpx;
							height: 40rpx;
						}
					}

					.renBox {
						position: relative;
						width: 200rpx;
						height: 280rpx;
						flex-shrink: 0;
						/* 防止被压缩 */
						overflow: hidden;

						.image {
							width: 100%;
							height: 100%;
							object-fit: cover;
						}

						.paraImage {
							width: 100%;
							height: 100%;
							-webkit-clip-path: polygon(0% 0%, 92% 0%, 100% 100%, 8% 100%);
							clip-path: polygon(0% 0%, 92% 0%, 100% 100%, 8% 100%);
							object-fit: cover;
							transition: transform 0.3s ease;
						}

						&:active .paraImage {
							transform: scale(1.05);
						}

						.nameImg {
							position: absolute;
							bottom: 0;
							right: 0;
							width: 180rpx;
							height: 36rpx;
						}

						.nameText {
							position: absolute;
							bottom: 0rpx;
							right: 0rpx;
							width: 180rpx;
							height: 36rpx;
							text-align: center;
							font-size: 22rpx;
							color: #FFFFFF;
						}
					}
				}
			}

			.nameBox {
				position: relative;
				width: 372rpx;
				height: 192rpx;
				background-image: url('/static/local_assets/home-background.png');
				background-position: center center;
				background-repeat: no-repeat;
				background-size: cover;

				.name1 {
					position: absolute;
					top: 46rpx;
					font-weight: 900;
					font-size: 42rpx;
					color: #1F1F1F;
					letter-spacing: 4px;
				}

				.name2 {
					position: absolute;
					bottom: 62rpx;
					font-weight: 400;
					font-size: 22rpx;
					color: #000000;
				}
			}
		}
	}
</style>
