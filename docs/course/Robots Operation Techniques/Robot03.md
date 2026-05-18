## 逆运动学问题

逆运动学问题为将笛卡尔空间到关节空间的转化。

**工作空间（workspace）**：机器人末端能至少以一种姿态到达的区域。进一步，**灵巧工作空间**为末端能以任意状态到达的区域，即达到+姿态能任意调整。

逆运动学可能无解、也可能有多解，需要进行解选择。解选择的原则通常使用最短行程原则，优先移动小连杆。

## 代数解法与几何解法

以平面三连杆为例。其中，连杆长度为 $l_1, l_2, l_3$，角度为 $\theta_1, \theta_2, \theta_3$；末端位姿只需要 $x,y,\phi$。

### 代数法

正向表示：

$$
\begin{align*}
x &= l_1 \cos\theta_1 + l_2\cos(\theta_1 + \theta_2) \\
y &= l_1 \sin\theta_1 + l_2\sin(\theta_1 + \theta_2) \\
\phi &= \theta_1 + \theta_2 + \theta_3
\end{align*}
$$

写为齐次矩阵形式：

$$
{}^0_3T = \begin{bmatrix}
c_{123} & -s_{123} & 0 & l_1c_1+l_2c_{12}  \\
s_{123} & c_{123} & 0 & l_1s_1+l_2s_{12}  \\
0 & 0 & 1 & 0 \\
0 & 0 & 0 & 1
\end{bmatrix}
$$

其中 $c_{12} = \cos(\theta_1 + \theta_2)$，$s_{123} = \sin (\theta_1 + \theta_2 + \theta_3)$。

由余弦定理解得 $\theta_2$（先根据cos范围判断是否有解）：

$$
c_2 = \frac{x^2 + y^2 - l_1^2 - l_2^2}{22l_1 l_2}
$$

解得 $\theta_2$ 后，定义及坐标变换:

$$
r=\sqrt{k_1^2 + k_2^2}, \gamma = \arctan 2(k_2, k_1)
$$

则解得 $\theta_1$ ：

$$
x=r\cos (\gamma + \theta_1), y=r\sin (\gamma + \theta_1)
$$

最终由 $\theta_3 = \phi - \theta_1 - \theta_2$ 解得 $\theta_1$。

### 几何法

画图，余弦定理。略。

## PIEPER三轴相交解法

当连续三个旋转轴交于一点时，逆运动学能解耦为位置问题和姿态问题。

## PUMA560实例
