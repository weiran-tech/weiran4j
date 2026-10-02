<template>
	<view class="dongtaiBox zzz3 pointer" @mouseover="isHovered = true" @mouseleave="isHovered = false">
		<image class="image1" :src="item.image" :mode="$isPC ? 'aspectFill' : 'widthFix'" style="object-fit: cover" />
		<view class='text1 textsl2' :style="{ color: isActive ? '#E62402' : '#000000' }">
			{{ item.title }}
		</view>
		<view class='text2' :style="{ color: isActive ? '#E62402' : '#000000' }">
			{{ item.created_at }}
		</view>
		<view class='line' :style="{ backgroundColor: isActive ? '#E62402' : '#eeeeee' }"></view>
		<view class='w100b'>
			<view class='button zzz3' :class="isActive ? 'button-first' : 'button-normal'">
				<view class='e1'>
					<text :style="{ color: isActive ? '#E62402' : '#999999' }">详情</text>
					<image :src="isActive ? '/static/local_assets/072a652e7997f2fab1bdff0c.png' : '/static/local_assets/1bee64b18103d2c0fc51a024.png'" />
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		name: "competitionNewsItem",
		props: {
			item: {
				type: Object,
				required: true,
				default: () => ({
					image: '',
					name: '',
					time: ''
				})
			},
			isSelected: {
				type: Boolean,
				default: false
			}
		},
		data() {
			return {
				isHovered: false // 新增 hover 状态
			};
		},
		computed: {
			// 合并 isSelected 与 hover 状态
			isActive() {
				return this.isSelected || this.isHovered;
			}
		}
	};
</script>

<style lang="scss" scoped>
	/*  电脑端 */
	@media (min-width: 769px) {
		.dongtaiBox {
			width: 19.27vw;
			margin-bottom: 2.45vw;
			overflow: hidden;

			.image1 {
				width: 100%;
				height: 14.58vw;
				margin-bottom: 1.56vw;
				border-radius: 20rpx;
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
				display: -webkit-box;
				-webkit-box-orient: vertical;
				-webkit-line-clamp: 2;
				overflow: hidden;
				text-overflow: ellipsis;
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

	/*  手机端 */
	@media (max-width: 768px) {
		.dongtaiBox {
			width: 100%;
			margin-bottom: 30rpx;
			overflow: hidden;

			.image1 {
				width: 100%;
				margin-bottom: 10rpx;
				border-radius: 20rpx;
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
				display: -webkit-box;
				-webkit-box-orient: vertical;
				-webkit-line-clamp: 2;
				overflow: hidden;
				text-overflow: ellipsis;
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

			.button,
			.button-first,
			.button-normal {
				display: none;
			}
		}
	}
</style>