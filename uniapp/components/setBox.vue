<template>
	<view>
		<view :class="$isPC?'set_all e2':'set_all e2 e3'">
			<view class='set_box pointer' v-for='(item, index) in list' :key='index' @mouseover="isHovered = index"
				@mouseleave="isHovered = -1" @click="goSaixBaoM(item,index)">
				<image class='image-all' :src='item.image' />
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		name: "setBox",
		props: {
			myInfo: {
				type: Object,
				default: () => ({}),
			},
		},
		data() {
			return {
				list: [{
					image: '/static/local_assets/54bee6e4f0bb526a51c413e8.png',
					text: '剧本写作赛项'
				}, {
					image: '/static/local_assets/bf09b80f8be320a61dc31dd7.png',
					text: '剧目演出赛项'
				}, ],
				isHovered: -1
			};
		},
		computed: {},
		methods: {
			goSaixBaoM(item, index) {
				console.log('----item', item)
				console.log('----index', index)
				if (this.myInfo && this.myInfo.phone) {
					uni.switchTab({
						url: '/pages/my/my?index=' + 0
					})
				} else {
					uni.reLaunch({
						url: '/pages/login/login'
					})
				}
			}
		}
	}
</script>

<style lang="scss">
	/*  电脑端样式 */
	@media (min-width: 769px) {
		.set_all {
			width: 62.5vw;
			max-width: 3400rpx;

			.set_box {
				position: relative;
				width: 28.915vw;
				height: 15.051vw;
				margin-bottom: 3.07vw;
				border-radius: 10px;

				/* 【新增】添加过渡动画，使放大效果平滑 */
				transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
				transform-origin: center center;
				/* 确保从中心放大 */
				z-index: 1;
				/* 防止放大时被相邻元素遮挡 */

				/* 【新增】鼠标悬停时放大 1.05 倍 */
				&:hover {
					transform: scale(1.05);
					z-index: 10;
					/* 悬停时提高层级，确保显示在最上方 */
					/* 可选：添加一点阴影增强立体感 */
					// box-shadow: 0 10px 20px rgba(0,0,0,0.15); 
				}

				.image-all {
					position: absolute;
					top: 0;
					left: 0;
					width: 100%;
					height: 100%;
					/* 确保图片本身不干扰 transform，由父容器控制 */
					pointer-events: none;
					border-radius: 10px;
				}

				/* 如果后续需要恢复 text 和 image 标签的样式，可取消下方注释 */
				/*
				text {
					position: absolute;
					top: 3.12vw;
					left: 14.85vw;
					font-weight: 500;
					font-size: 1.17vw;
					color: #000000;
					pointer-events: none;
				}

				image {
					position: absolute;
					top: 8.12vw;
					left: 14.85vw;
					width: 8.35vw;
					pointer-events: none;
				}
				*/
			}
		}
	}

	/*  手机端样式 */
	@media (max-width: 768px) {
		.set_all {
			width: 700rpx;
			margin-bottom: 24rpx;

			.set_box {
				position: relative;
				width: 100%;
				height: 400rpx;
				margin-bottom: 24rpx;

				/* 【新增】手机端添加点击/触摸时的反馈效果 */
				transition: transform 0.2s;
				transform-origin: center center;

				/* 手机端通常没有 hover，使用 :active 模拟触摸按下的放大效果 */
				&:active {
					transform: scale(0.98);
					/* 手机端通常缩小一点表示按下，或者您想要放大也可以改为 1.02 */
				}

				.image-all {
					position: absolute;
					top: 0;
					left: 0;
					width: 100%;
					height: 100%;
					pointer-events: none;
				}

				/* 手机端原有样式保留 */
				/*
				text {
					position: absolute;
					top: 80rpx;
					left: 400rpx;
					font-weight: 500;
					font-size: 32rpx;
					color: #000000;
					pointer-events: none;
				}

				image {
					position: absolute;
					top: 180rpx;
					left: 400rpx;
					width: 260rpx;
					pointer-events: none;
				}
				*/
			}
		}
	}

	/* 辅助类：确保指针样式 */
	.pointer {
		cursor: pointer;
	}
</style>