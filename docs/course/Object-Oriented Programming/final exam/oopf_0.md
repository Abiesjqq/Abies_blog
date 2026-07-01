## C++基础

流: cin/cout, cerr, clog

std::endl 刷新缓冲区; cin 跳过空格, 遇到空格 tab 换行停止; std::getline(std::cin, str)

命名空间, namespace 定义, `::` 解析

vector 遍历:

- 下标
- ` for (auto num : nums)`
- 迭代器: `for (auto it=nums.begin(); it!=nums.end(); ++it)`

protected: 类内 + 派生类可访问

## 构造, 析构, 拷贝

引用不能为空, 必须初始化, 不能重新绑定.

转换等级 (int, 浮点, long, bool分为四类):

1. 精确匹配
2. promotion: 同类中向上提升
3. conversion: 不同类间转换
4. 用户自定义
5. 省略号: 匹配任何值

当向多个重载函数转换, 且转换等级都相同时, 报二义性错误.

重载函数前加 `explicit`, 表示不允许拷贝构造和隐式转化.

类型转换运算符: 在需要时自动转换为目标类型.

```cpp
operator 目标类型() {
    return 目标类型的表达式;
}
```

inline: 加前缀, 调用时建议展开 (但不一定)

匿名函数 (对象): `[捕获列表](参数列表) -> 返回类型{函数体}`. 捕获列表用于定义可以访问外部作用域中哪些变量, 有`[]``[x]` `[&x]` `[=]` `[&]`.

e.g., 降序排序: `sort(nums.begin(), nums.end(), [](int a, int b){ return a > b; });`

默认构造函数: 无参数, 或参数都有默认值. 没有定义, 则自动生成, 成员变量为随机值.

初始化列表: `Point(int x) : x(x) {}`. 构造函数体内, 先默认构造再赋值. const 和引用只能初始化列表.

析构没有参数, 没有返回值, 不能重载.

数组的内存管理:

```cpp
auto* pl = new int[4];
delete[] pl;
```

内存从上到下:

1. CPU虚拟内存
2. 栈 (向下延伸): 局部变量
3. 堆 (向上延伸): malloc 和 new 分配的
4. 可读写区: 全局变量和静态变量
5. 只读区: 程序和常量

浅拷贝: 直接新指针=旧指针, 指向同一地址, 退出时 double free 报错 (不能在析构中 delete).

深拷贝: 手动拷贝指针指向对象的元素.

拷贝构造: 用已有的创建新的. `ClassName(const ClassName& other)`. 触发条件:

- `ClassName obj2 = obj1`
- `ClassName obj2(obj1)`
- 函数参数, 值传递

拷贝赋值运算符: `ClassName& operator=(const ClassName& other);`. 先释放旧资源, 再深拷贝.

成员函数默认有 this 指针, 不可修改.

## 继承与多态

继承: `class Derived : public Base {}`. 继承方式 (基类中 private 都不能直接访问):

- public: 成员权限不变
- protected: 基类中 public 变为 protected
- private: 基类中 public 和 protected 变为 private

class 默认 private 继承, struct 默认 public 继承.

构造: 先基类构造函数, 再派生类. 析构相反.

函数的默认参数在声明和定义中, 只能指定一次.

虚继承: 解决菱形继承. 继承方式前加 virtual, 保证只有一个共享实例.

组合 (composition) 表示将对象作为另一个对象的成员.

友元 (friend) 为类外部函数, 但有访问 private 和 protected 的权限. 需要在类内声明 `friend int friFunc()`. 没有 this 指针.

友元单向, 不可传递, 不可继承.

友元重载运算符:

```cpp
friend std::ostream& operator<<(std::ostream& os, const Complex& c) {
    os << c.real << " + " << c.imag << "i";
    return os;
}
```

不可重载的运算符: `.` `::` `?:` `sizeof`

单目运算符 `++`, `operator++` 表示前置 (++i), `operator++(int)` 表示后置 (i++), 其中 int 不是参数, 仅用于区分.

虚函数: 基类前加 virtual. 派生类后可选加 override (编译器检查签名是否一致); 可选加 final (不能在被重写).

派生类普通重载时, 声明为基类对象的, 则调用基类函数; 若虚函数, 且调用时为指针或引用, 则用创建类型的函数.

esp., 若需要通过派生类析构销毁, 基类必须为 virtual. 构造不能为虚.

抽象类: 包含纯虚函数 `virtual void func() = 0;`. 定义接口, 不能实例化为对象, 但可以为指针或引用.

类型转换:

- `static_cast<目标类型>(源变量)`: 类间转换; 非 const 转 const; 向上转换; 语法上可以从基类向派生类转化
- `dynamic_cast<基类指针>(派生类指针)`: 基类至少有一个虚函数, 必须有继承关系; 失败时返回 nullptr, 引用抛异常.
- `const_cast`: 和 const 相关
- `reinterpret_cast`: 重解释

## 移动语义, 异常处理

联合体 union: 同一内存, 不同类型. 不能同时用.

枚举 enum: 从 0 开始分配. 全局可见, 非 class 则不能重复定义. class 是语法关键字, 和继承无关. e.g.

```cpp
enum Color {  // C
    RED,
    GREEN,
    BLUE
}
Color myColor = RED;

enum class Status {  // C++
    OK = 200,
    NOT_FOUND = 404,
    INTERNAL_ERROR = 500
};
Status s = Status::OK;  // must sepcify domain
```

const 与指针:

- 在 `*` 之前: 指向的内容为常量
- 在 `*` 之后: 指针地址为常量

const 对象只能调用 const 函数.

static 使变量的生命周期为当前这个源文件的程序运行期间.

static + 成员变量, 类的所有对象共享同一个该变量. 需要类外初始化 `int ClassName::x = 0;`. 构造时不能用初始化列表.

右值是字面量或临时的算数表达式. C++11中, `T&&` 表示右值引用.

移动语义: 直接转移资源. 用于移动构造和移动赋值, 传入参数为 `ClassName&& other`.

异常处理: 函数中 `throw`; 调用时 `try{ ... } catch(异常类型){ ... }`, 抛出异常后面的语句不执行.

函数后加 `noexcept` 关键字, 表示不抛出任何异常.

## 模板, STL, 迭代器

模板本身不编译, 调用时才实例化.

模板类的参数可以是普通类型, 如

```cpp
template <typename T, int Size>
class GenericArray {
   public:
    T& operator[](int idx) { return arr[idx]; }
   private:
    T arr[Size];
}

GenericArray<int, 10> int_arr;
```

可以将模板参数设为空, 在函数后指定参数, 称为模板的全特化.

unordered_set:

- `set.insert(val)`
- `set.erase(val)`
- `if(set.find(val) != set.end())`

unordered_map:

- `map[val]++` 自动创建 
- `map.erase(val)`

stack:

- `stack.push(val)`
- `stack.top()`
- `stack.pop()` 不返回栈顶

queue:

- `queue.push(val)`
- `queue.front()`
- `queue.back()`
- `queue.pop()` 不返回

大顶堆: `priority_queue<int> maxHeap;`

小顶堆: `priority_queue<int, vector<int>, greate<int>> minHeap;`

断言: `assert(arr != nullptr);`

`vec.cbegin()` 和 `vec.cend()` 表示 const_iterator.

vector 进行 push_back 或 erase 后, 原先的迭代器都失效. 其他容器中, 只有迭代器所在位置变化时失效.

迭代器前加 `*`, 取出其中元素值

