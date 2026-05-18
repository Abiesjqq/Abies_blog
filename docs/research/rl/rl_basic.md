# PPO原理 

PPO（proximal policy optimization）属于Actor-Critic方法，包含策略网络Actor，用于输出动作概率 $\pi_{\theta}(a|s)$，和价值网络Critic，用于输出状态价值 $V(s)$。

和普通policy gradient相比，PPO引入clipping防止策略单次变化过大。具体方法为clamp前后策略的比例（ratio）。

# PPO流程

1. 预测输出：根据当前observation，Actor输出action，Critic输出value
2. 计算优势：用Critic的估计值和reward计算GAE advantage
3. 裁剪幅度：重新计算当前策略对旧action的log_prob，用clipping限制策略更新幅度
4. 更新：同时更新Actor和Critic，定期evaluate

# 优化方法

## GAE Advantage

普通advantage为return-Critic的估计值，训练容易抖动。GAE既利用Critic的估计，又利用真实reward修正它。

TD error（temporal difference error）表示当前一步Critic预测错了多少：

$$
\delta_t = (r_t + \gamma V(s_{t+1})) - V(s_t)
$$

GAE advantage为一系列TD error的加权和，权值为gamma乘gae_lambda的幂。

## Entropy Bonus

离散分布熵表示策略的随机程度。在loss中减部分离散分布熵，表示鼓励高熵，使策略保持探索。

## Mini-Batch

将完整rollout的数据打乱，分成多个小组，多次更新

# 代码实现

??? examples "CartPole-v1"

    ```py
    import gymnasium as gym
    import torch
    import torch.nn as nn
    from torch.distributions import Categorical
    import numpy as np
    import matplotlib.pyplot as plt


    class Actor(nn.Module):
        def __init__(self, obs_dim, act_dim):
            super().__init__()
            self.net = nn.Sequential(
                nn.Linear(obs_dim, 64),
                nn.Tanh(),
                nn.Linear(64, 64),
                nn.Tanh(),
                nn.Linear(64, act_dim),
                nn.Softmax(dim=-1),
            )

        def forward(self, obs):
            probs = self.net(obs)
            return Categorical(probs)
        

    class Critic(nn.Module):
        def __init__(self, obs_dim):
            super().__init__()
            self.net = nn.Sequential(
                nn.Linear(obs_dim, 64),
                nn.Tanh(),
                nn.Linear(64, 64),
                nn.Tanh(),
                nn.Linear(64, 1),
            )

        def forward(self, obs):
            return self.net(obs).squeeze(-1)
        
    # 连续采样step步得到trajectory，收集rewards等
    def collect_rollout(env, actor, critic, steps):
        obs_list = []
        action_list = []
        logprob_list = []
        reward_list = []
        done_list = []
        value_list = []

        obs, _ = env.reset()
        
        for _ in range(steps):
            obs_tensor = torch.tensor(obs, dtype=torch.float32)
            with torch.no_grad():
                dist = actor(obs_tensor)
                action = dist.sample()
                logprob = dist.log_prob(action)
                value = critic(obs_tensor)

            next_obs, reward, terminated, truncated, _ = env.step(action.item())
            done = terminated or truncated

            obs_list.append(obs)
            action_list.append(action.item())
            logprob_list.append(logprob.item())
            reward_list.append(reward)
            done_list.append(done)
            value_list.append(value.item())

            obs = next_obs
            if done:
                obs, _ = env.reset()

        return obs_list, action_list, logprob_list, reward_list, done_list, value_list


    # 根据一系列rewards和dones，计算return
    def compute_returns(rewards, dones, gamma=0.99):
        returns = []
        G = 0

        for reward, done in zip(reversed(rewards), reversed(dones)):
            if done:
                G = 0
            G = reward + gamma * G
            returns.insert(0, G)
        
        return torch.tensor(returns, dtype=torch.float32)


    # 根据每一步的rewards和Critic的估计值，计算每一步的GAE advantage
    def compute_gae(rewards, dones, values, gamma=0.99, gae_lambda=0.95):
        advantages = []
        gae = 0
        next_value = 0

        for step in reversed(range(len(rewards))):
            if dones[step]:
                next_value = 0
                next_non_terminal = 0
            else:
                next_non_terminal = 1
        
            delta = rewards[step] + gamma * next_value * next_non_terminal - values[step]
            gae = delta + gamma * gae_lambda * next_non_terminal * gae
            advantages.insert(0, gae)

            next_value = values[step]

        advantages = torch.tensor(advantages, dtype=torch.float32)
        values = torch.tensor(values, dtype=torch.float32)
        returns = advantages + values

        return returns, advantages


    # 更新策略
    def ppo_update(
            actor,
            critic,
            optimizer,
            obs_list,
            action_list,
            old_logprob_list,
            reward_list,
            done_list,
            value_list,
            train_epochs=5,
            batch_size=256,
            clip_eps=0.2,
            gamma=0.99,
            gae_lambda=0.95,
    ):
        obs_tensor = torch.tensor(np.array(obs_list), dtype=torch.float32)  # 状态序列
        action_tensor = torch.tensor(action_list, dtype=torch.int64)  # 动作序列
        old_logprob_tensor = torch.tensor(old_logprob_list, dtype=torch.float32)  # 动作概率的对数序列

        returns, advantages = compute_gae(  # 得到每一步的GAE
            reward_list,
            done_list,
            value_list,
            gamma=gamma,
            gae_lambda=gae_lambda,
        )
        advantages = (advantages - advantages.mean()) / (advantages.std() + 1e-8)  # 归一化advantage

        num_samples = len(obs_tensor)  # 总状态数

        for _ in range(train_epochs):  # 循环train_epochs次
            indices = np.arange(num_samples)  # 对每个状态编号
            np.random.shuffle(indices)  # 打乱状态

            for start in range(0, num_samples, batch_size):  # 按mini-batch大小取数据
                end = start + batch_size
                batch_idx = indices[start:end]

                batch_obs = obs_tensor[batch_idx]  # 得到每个mini-batch的数据
                batch_actions = action_tensor[batch_idx]
                batch_old_logprob = old_logprob_tensor[batch_idx]
                batch_returns = returns[batch_idx]
                batch_advantages = advantages[batch_idx]  # 每个动作实际值和估计值的偏差

                dist = actor(batch_obs)  # Actor输出动作的概率分布
                new_logprob = dist.log_prob(batch_actions)  # 对每个动作概率求对数
                new_values = critic(batch_obs)  # Critic估计value

                ratio = torch.exp(new_logprob - batch_old_logprob)  # 计算新旧动作概率的比值

                unclipped = ratio * batch_advantages  # clip前，直接按advantage方向更新
                clipped = torch.clamp(ratio, 1 - clip_eps, 1 + clip_eps) * batch_advantages  # clip后，限制更新幅度

                actor_loss = -torch.min(unclipped, clipped).mean()  # 调整动作概率
                critic_loss = ((batch_returns - new_values) ** 2).mean()  # 均方误差MSE，估计更准
                entropy = dist.entropy().mean()  # entropy bonus
                loss = actor_loss + 0.5 * critic_loss - 0.01 * entropy

                optimizer.zero_grad()
                loss.backward()
                optimizer.step()

        return actor_loss.item(), critic_loss.item()


    # 评价函数
    def evaluate(env, actor, episodes=5):
        total_rewards = []

        for _ in range(episodes):
            obs, _ = env.reset()
            done = False
            total_reward = 0

            while not done:
                obs_tensor = torch.tensor(obs, dtype=torch.float32)
                with torch.no_grad():
                    dist = actor(obs_tensor)
                    action = torch.argmax(dist.probs).item()

                obs, reward, terminated, truncated, _ = env.step(action)
                done = terminated or truncated
                total_reward += reward

            total_rewards.append(total_reward)

        return sum(total_rewards) / len(total_rewards)


    # 绘制结果
    def plot_training_curves(updates, avg_rewards, actor_losses, critic_losses):
        plt.figure(figsize=(12, 8))

        plt.subplot(3, 1, 1)
        plt.plot(updates, avg_rewards)
        plt.ylabel("Avg Reward")
        plt.title("PPO Training on CartPole-v1")
        plt.grid(True)

        plt.subplot(3, 1, 2)
        plt.plot(updates, actor_losses)
        plt.ylabel("Actor Loss")
        plt.grid(True)

        plt.subplot(3, 1, 3)
        plt.plot(updates, critic_losses)
        plt.xlabel("Update")
        plt.ylabel("Critic Loss")
        plt.grid(True)

        plt.tight_layout()
        plt.savefig("ppo_training_curves.png", dpi=200)
        plt.show()


    def main():
        env = gym.make("CartPole-v1")

        obs_dim = env.observation_space.shape[0]
        act_dim = env.action_space.n

        actor = Actor(obs_dim=obs_dim, act_dim=act_dim)
        critic = Critic(obs_dim=obs_dim)

        optimizer = torch.optim.Adam(
            list(actor.parameters()) + list(critic.parameters()),
            lr=3e-4
        )

        rollout_steps = 2048
        num_updates = 100
        train_epochs = 5

        logged_updates = []
        avg_rewards = []
        actor_losses = []
        critic_losses = []

        for update in range(num_updates):
            (
                obs_list,
                action_list,
                old_logprob_list,
                reward_list,
                done_list,
                value_list,
            ) = collect_rollout(env, actor, critic, rollout_steps)

            actor_loss, critic_loss = ppo_update(
                actor,
                critic,
                optimizer,
                obs_list,
                action_list,
                old_logprob_list,
                reward_list,
                done_list,
                value_list,
                train_epochs=train_epochs,
            )

            if update % 5 == 0:
                avg_reward = evaluate(env, actor, episodes=20)

                logged_updates.append(update)
                avg_rewards.append(avg_reward)
                actor_losses.append(actor_loss)
                critic_losses.append(critic_loss)

                print(
                    f"update={update}, "
                    f"avg_reward={avg_reward:.1f}, "
                    f"actor_loss={actor_loss:.4f}, "
                    f"critic_loss={critic_loss:.4f}"
                )

        plot_training_curves(
            logged_updates,
            avg_rewards,
            actor_losses,
            critic_losses,
        )

        env.close()


    if __name__ == '__main__':
        main()

    ```