/**
 * @param {number} capacity
 */
 //本题采用双向指针，哈希表来实现功能。双向链表的头尾两个节点，都不存放值。
function LRUCache (capacity) {
    this.capacity = capacity;
    this.head = {key:null, value:null, next:null, prev:null};
    this.tail = {key:null, value:null, next:null, prev:null};
    this.cache = new Map();
    this.head.next = this.tail;
    this.tail.prev = this.head;
}

LRUCache.prototype.moveToHead = function (node) {
    this.removeNode(node);
    this.addToHead(node);
}

LRUCache.prototype.removeNode = function(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
}

LRUCache.prototype.addToHead = function(node) {
    this.head.next.prev = node;
    node.next = this.head.next;
    this.head.next = node;
    node.prev = this.head;
}

LRUCache.prototype.get = function (key) {
    if(!this.cache.has(key)) return -1;

    this.moveToHead(this.cache.get(key));
    return this.cache.get(key).value;
}

LRUCache.prototype.put = function (key, value) {
    //先检查有没有这个key,如果有就尝试改里面的值，并移到头部。如果不存在就插入值，此时可能会超出限制
    if(this.cache.has(key)) {
        const node = this.cache.get(key);
        node.value = value;
        this.moveToHead(node);
        return;
    }

    const node = {key: key, value: value, next: null, prev: null};
    this.addToHead(node);
    this.cache.set(key, node);
    if(this.cache.size > this.capacity) {
        this.cache.delete(this.tail.prev.key)
        this.removeNode(this.tail.prev);
    }
}

